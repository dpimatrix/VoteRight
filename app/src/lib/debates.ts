import { db } from "./db";

/* Phase 3: proposals → seconding → text debate. Clustering, amendments, and media
   formats are volume-triggered later features (ARCHITECTURE.md §12 Phase 3 note). */

const SECOND_THRESHOLD = 3; // pilot-scale; production scales to jurisdiction size
export const CLAIMS_ALGO = "claims-heuristic-v0.1";
// Disk-exhaustion guard (ARCHITECTURE.md §9.1), not spam prevention -- that's
// the separate per-thread-per-side argument limit ARCHITECTURE.md already
// flags as its own TBD. A verified user could otherwise post arbitrarily many
// ~250MB (MAX_UPLOAD_BYTES) files back to back; this bounds worst-case daily
// growth per user to a knowable number regardless of what else changes.
// Counts pending/removed posts too, not just approved ones -- disk space is
// consumed the moment the file is transcoded, independent of moderation
// outcome. Pilot-scale starting point, easy to retune.
const MEDIA_RATE_LIMIT_PER_DAY = 5;

/* ── verification tier (§9 gate; §2.6 self-attested + format-verified) ── */
export async function userTier(userId: string): Promise<string> {
  const { rows } = await db().query(`SELECT verification_tier FROM users WHERE id = $1`, [userId]);
  return rows[0]?.verification_tier ?? "unverified";
}

/** Most recent address verification timestamp, for the "verified since" line
    a returning user sees before choosing to re-verify (change-of-address
    guardrail — surfaces the current state instead of silently overwriting it). */
export async function lastVerifiedAt(userId: string): Promise<Date | null> {
  const { rows } = await db().query(
    `SELECT verified_at FROM verification_records
      WHERE user_id = $1 AND method = 'address_attestation'
      ORDER BY verified_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0]?.verified_at ?? null;
}

// All 50 USPS state abbreviations + DC. Used only as a cheap plausibility
// pre-check (see addressLooksValid below) -- the real gate is the live Census
// geocoder call right after this, so a false positive here costs nothing (a
// bogus "123 Main St OK" still won't resolve to a real jurisdiction), but a
// false negative would silently reject a real address before that call ever
// runs. Was hardcoded to just MD/VA/DC from the original DMV-pilot scope;
// widened once nationwide state/federal coverage made every US address a
// real candidate (see jurisdictionForGeography's state-level fallback).
const US_STATE_ABBRS =
  "al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc";

export function addressLooksValid(address: string): boolean {
  // Dev-grade format check standing in for the geocoding vendor (§2.6): a street
  // number, a street name, and something jurisdiction-plausible. Never matched
  // against any voter file. The real gate is resolveJurisdiction's live Census
  // geocoder call right after this; this is just a cheap pre-check to reject
  // obviously-malformed input before that call.
  return (
    new RegExp(`\\d+\\s+\\S+.*\\s+(?:${US_STATE_ABBRS}|d\\.c\\.|maryland|virginia|district of columbia)\\b`, "i").test(
      address.trim(),
    ) && address.trim().length >= 12
  );
}

export async function verifyAddress(
  userId: string,
  address: string,
  requestContext?: { ip: string | null; contextHash: string | null },
): Promise<"ok" | "bad_format" | "no_match" | "outside" | "resolver_unavailable"> {
  if (!addressLooksValid(address)) return "bad_format";
  const { resolveJurisdiction } = await import("./jurisdictions");
  const res = await resolveJurisdiction(address);
  if (res.outcome !== "ok") return res.outcome;
  const residence = res.jurisdiction;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // jurisdiction_id (migration 096): the jurisdiction THIS attestation
    // resolved to, not just whatever users.residence_jurisdiction_id ends
    // up as below -- a later re-verification overwrites that column, but
    // this row's own jurisdiction_id is what issueBallot()'s anti-gaming
    // check needs to confirm which jurisdiction was actually attested to
    // as of any given past verified_at, independent of where the user
    // lives now.
    await client.query(
      `INSERT INTO verification_records (user_id, method, provider_reference, expires_at, jurisdiction_id)
       VALUES ($1, 'address_attestation', $2, now() + interval '1 year', $3)`,
      [userId, `format-check-v0.1+${res.method}`, residence],
    );
    await client.query(
      `UPDATE users SET verification_tier = 'address_verified'
        WHERE id = $1 AND verification_tier IN ('unverified', 'email_verified')`,
      [userId],
    );
    // The resolved jurisdiction always follows the latest verified address —
    // moving from Silver Spring to Rockville changes what your address elects.
    // Resolved districts (added migration 075) follow the same rule — a
    // fresh re-verification always overwrites the old ones, including with
    // null if this resolution didn't produce one (never leave a stale
    // district from a previous address sitting around).
    await client.query(
      `UPDATE users SET residence_jurisdiction_id = $2,
              congressional_district = $3, state_senate_district = $4, state_house_district = $5,
              county_council_district = $6, board_of_education_district = $7, appellate_circuit = $8
        WHERE id = $1`,
      [
        userId, residence, res.districts.congressional, res.districts.stateSenate, res.districts.stateHouse,
        res.districts.countyCouncil, res.districts.boardOfEducation, res.districts.appellateCircuit,
      ],
    );
    if (requestContext) {
      const { flagIfAnomalous } = await import("./anomalyDetection");
      // The root action a Sybil attacker performs first -- minting many
      // "verified" identities before ever touching seconds/ballots.
      await flagIfAnomalous(client, {
        action: "address_verification",
        userId,
        ip: requestContext.ip,
        contextHash: requestContext.contextHash,
      });
    }
    await client.query("COMMIT");
    return "ok";
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* ── proposals ── */
export async function listProposals() {
  const { rows } = await db().query(
    `SELECT p.id, p.title, p.status, p.second_threshold, t.name AS topic,
            (SELECT count(*)::int FROM seconds s WHERE s.proposal_id = p.id) AS seconds,
            ft.id AS thread_id, ft.closes_at::date::text AS closes,
            (SELECT count(*)::int FROM arguments a WHERE a.thread_id = ft.id AND a.moderation_status = 'approved') AS args
       FROM issue_proposals p
       JOIN topics t ON t.id = p.topic_id
       LEFT JOIN forum_threads ft ON ft.proposal_id = p.id
      ORDER BY (p.status = 'debating') DESC, (p.status = 'seconding') DESC, p.created_at DESC`,
  );
  return rows as {
    id: string; title: string; status: string; second_threshold: number; topic: string;
    seconds: number; thread_id: string | null; closes: string | null; args: number;
  }[];
}

export async function createProposal(opts: {
  userId: string;
  topicId: string;
  title: string;
  body: string;
  // Optional non-repudiation signature (ARCHITECTURE.md Section 10) - see the
  // same tradeoff note on postArgument above: unsigned proposals still work.
  signature?: string;
  publicKeyFingerprint?: string;
  contextHash?: string;
}): Promise<{ signatureInvalid: true } | { signatureInvalid: false; id: string }> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // The proposal's jurisdiction is wherever its creator actually lives, not a
    // hardcoded county — createProposal is only reachable via verifiedUserId(),
    // so a real residence_jurisdiction_id is already guaranteed to be set by the
    // time an address_verified user gets here (see verifyAddress in this file).
    const residence = await client.query(`SELECT residence_jurisdiction_id FROM users WHERE id = $1`, [opts.userId]);
    const jurisdictionId = residence.rows[0]?.residence_jurisdiction_id as string | undefined;
    if (!jurisdictionId) {
      await client.query("ROLLBACK");
      throw new Error("createProposal: creating user has no residence_jurisdiction_id set");
    }
    let signedActionId: string | null = null;
    if (opts.signature && opts.publicKeyFingerprint) {
      const { recordSignedAction, canonicalProposalPayload } = await import("./signing");
      try {
        signedActionId = await recordSignedAction(client, {
          userId: opts.userId,
          publicKeyFingerprint: opts.publicKeyFingerprint,
          actionType: "issue_proposal",
          canonicalPayload: canonicalProposalPayload(opts),
          signature: opts.signature,
          contextHash: opts.contextHash,
        });
      } catch {
        await client.query("ROLLBACK");
        return { signatureInvalid: true };
      }
    }
    const { rows } = await client.query(
      `INSERT INTO issue_proposals
         (created_by_user_id, jurisdiction_id, topic_id, title, body, second_threshold, signed_action_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [opts.userId, jurisdictionId, opts.topicId, opts.title, opts.body, SECOND_THRESHOLD, signedActionId],
    );
    await client.query("COMMIT");
    return { signatureInvalid: false, id: rows[0].id as string };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* ── seconding (public act) ── */
export async function secondProposal(
  proposalId: string,
  userId: string,
  tier: string,
  signing?: { signature: string; publicKeyFingerprint: string; contextHash?: string },
  // Independent of signing (which is best-effort/optional -- see the
  // signing parameter above), unlike signing.contextHash which is only ever
  // computed on the signed path. Sybil detection (ARCHITECTURE.md §9) needs
  // to run on every second, signed or not, since signing itself is
  // unenforced and an automated Sybil client would simply omit it.
  requestContext?: { ip: string | null; contextHash: string | null },
): Promise<{ signatureInvalid: true } | { selfSecond: true } | { signatureInvalid: false; selfSecond: false }> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // A proposal's own author can't second it — seconding is meant to signal
    // independent support from other residents, not the author re-endorsing
    // their own idea.
    const author = await client.query(`SELECT created_by_user_id FROM issue_proposals WHERE id = $1`, [proposalId]);
    if (author.rows[0]?.created_by_user_id === userId) {
      await client.query("ROLLBACK");
      return { selfSecond: true };
    }
    let signedActionId: string | null = null;
    if (signing) {
      const { recordSignedAction, canonicalSecondPayload } = await import("./signing");
      try {
        signedActionId = await recordSignedAction(client, {
          userId,
          publicKeyFingerprint: signing.publicKeyFingerprint,
          actionType: "second",
          canonicalPayload: canonicalSecondPayload({ userId, proposalId }),
          signature: signing.signature,
          contextHash: signing.contextHash,
        });
      } catch {
        await client.query("ROLLBACK");
        return { signatureInvalid: true };
      }
    }
    await client.query(
      `INSERT INTO seconds (proposal_id, user_id, verification_tier_at_second, signed_action_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [proposalId, userId, tier, signedActionId],
    );
    if (requestContext) {
      const { flagIfAnomalous } = await import("./anomalyDetection");
      await flagIfAnomalous(client, {
        action: "second",
        userId,
        ip: requestContext.ip,
        contextHash: requestContext.contextHash,
      });
    }
    const { rows } = await client.query(
      `SELECT p.status, p.second_threshold,
              (SELECT count(*)::int FROM seconds s WHERE s.proposal_id = p.id) AS n
         FROM issue_proposals p WHERE p.id = $1 FOR UPDATE`,
      [proposalId],
    );
    if (rows[0] && rows[0].status === "seconding" && rows[0].n >= rows[0].second_threshold) {
      await client.query(`UPDATE issue_proposals SET status = 'debating' WHERE id = $1`, [proposalId]);
      await client.query(
        `INSERT INTO forum_threads (proposal_id, closes_at) VALUES ($1, now() + interval '14 days')
         ON CONFLICT (proposal_id) DO NOTHING`,
        [proposalId],
      );
    }
    await client.query("COMMIT");
    return { signatureInvalid: false, selfSecond: false };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* ── debate detail ── */
export async function debateDetail(proposalId: string, userId: string | null) {
  const p = await db().query(
    `SELECT p.id, p.title, p.body, p.status, p.second_threshold, t.name AS topic,
            (p.created_by_user_id = $2) AS is_author,
            (SELECT count(*)::int FROM seconds s WHERE s.proposal_id = p.id) AS seconds,
            EXISTS (SELECT 1 FROM seconds s WHERE s.proposal_id = p.id AND s.user_id = $2) AS has_seconded,
            ft.id AS thread_id, ft.opened_at, ft.closes_at::date::text AS closes, ft.closed_early, ft.status AS thread_status,
            ft.closed_reason, ft.close_early_threshold_pct::float AS ctq_pct,
            ft.call_the_question_min_agreement_votes AS ctq_min_agreement_votes,
            ft.call_the_question_min_active AS ctq_min_active,
            ft.call_the_question_min_open_hours AS ctq_min_open_hours,
            EXISTS (SELECT 1 FROM thread_reports tr WHERE tr.thread_id = ft.id AND tr.user_id = $2) AS reported
       FROM issue_proposals p
       JOIN topics t ON t.id = p.topic_id
       LEFT JOIN forum_threads ft ON ft.proposal_id = p.id
      WHERE p.id = $1`,
    [proposalId, userId],
  );
  if (p.rowCount === 0) return null;
  const row = p.rows[0];
  let args: unknown[] = [];
  let ctq = null;
  if (row.thread_id) {
    const a = await db().query(
      `SELECT a.id, a.side, a.body_text, a.format, a.audio_url, a.video_url, a.video_duration_seconds,
              a.transcript_text, a.moderation_status, a.created_at::date::text AS date,
              a.agree_count, a.disagree_count, a.pass_count,
              COALESCE(u.display_name, 'Resident') AS display_name, (a.user_id = $2) AS mine,
              -- Supporter+ badge (ARCHITECTURE.md §14.1) -- purely cosmetic
              -- recognition, computed the same "active subscription only"
              -- way subscriptions.ts's currentTier() does; never affects
              -- ordering, visibility, or anything about the argument itself.
              (u.subscription_tier IS NOT NULL AND u.subscription_status IN ('active', 'trialing')) AS is_supporter,
              COALESCE((SELECT json_agg(json_build_object('publisher', c.publisher, 'title', c.title))
                 FROM argument_citations ac JOIN citations c ON c.id = ac.citation_id
                WHERE ac.argument_id = a.id), '[]') AS citations,
              (SELECT v.response FROM argument_agreement_votes v WHERE v.argument_id = a.id AND v.user_id = $2) AS my_vote
         FROM arguments a JOIN users u ON u.id = a.user_id
        WHERE a.thread_id = $1 AND (a.moderation_status = 'approved' OR a.user_id = $2)
        ORDER BY a.side, a.agree_count DESC, a.created_at`,
      [row.thread_id, userId],
    );
    args = a.rows;

    // "Call the question" (migration 094, restoring migration 093's removal
    // with real floors) -- floorsMet gates whether the mechanism is even
    // OFFERED at all, independent of whether THIS user specifically is
    // eligible to cast a vote. See ctqVote()'s own header comment for the
    // full reasoning on both floors.
    const c = await db().query(
      `WITH active AS (
         SELECT user_id FROM arguments WHERE thread_id = $1 AND moderation_status = 'approved'
         UNION
         SELECT v.user_id FROM argument_agreement_votes v
           JOIN arguments a ON a.id = v.argument_id
          WHERE a.thread_id = $1
          GROUP BY v.user_id HAVING count(*) >= $3
       )
       SELECT (SELECT count(*)::int FROM active) AS active,
              (SELECT count(*)::int FROM call_the_question_votes WHERE thread_id = $1) AS votes,
              EXISTS (SELECT 1 FROM active WHERE user_id = $2) AS eligible,
              EXISTS (SELECT 1 FROM call_the_question_votes WHERE thread_id = $1 AND user_id = $2) AS voted`,
      [row.thread_id, userId, row.ctq_min_agreement_votes],
    );
    const hoursOpen = (Date.now() - new Date(row.opened_at).getTime()) / 3600_000;
    const floorsMet = c.rows[0].active >= row.ctq_min_active && hoursOpen >= row.ctq_min_open_hours;
    ctq = {
      ...c.rows[0],
      floorsMet,
      minActive: row.ctq_min_active,
      minOpenHours: row.ctq_min_open_hours,
      hoursOpen: Math.floor(hoursOpen),
    };
  }
  return { ...row, args, ctq };
}

/* ── arguments + §7.7 claim prompt ── */
export function detectClaim(text: string): string | null {
  const m = text.match(
    /[^.!?]*(?:\$\s?\d[\d,.]*|\d+(?:\.\d+)?\s*%|\b\d[\d,]* (?:percent|homes|units|officers|dollars|students)\b|\bwill (?:cost|raise|increase|cut|add|save)\b[^.!?]*)[^.!?]*/i,
  );
  return m ? m[0].trim().slice(0, 200) : null;
}

export async function postArgument(opts: {
  threadId: string;
  userId: string;
  side: "for" | "against" | "neutral_info";
  body: string;
  citationUrl?: string;
  citationTitle?: string;
  claimResponse?: "added_citation" | "marked_as_opinion" | "dismissed";
  // Optional non-repudiation signature (ARCHITECTURE.md Section 10). Both fields
  // must be present together or not at all; unsigned posting still works (the
  // client-side signing UI is a separate, incremental rollout) — signed_action_id
  // just stays null for unsigned posts.
  signature?: string;
  publicKeyFingerprint?: string;
  contextHash?: string;
}) {
  const claim = detectClaim(opts.body);
  if (claim && !opts.claimResponse && !opts.citationUrl) {
    return { prompted: true as const, claim };
  }
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    let signedActionId: string | null = null;
    if (opts.signature && opts.publicKeyFingerprint) {
      const { recordSignedAction, canonicalArgumentPayload } = await import("./signing");
      try {
        signedActionId = await recordSignedAction(client, {
          userId: opts.userId,
          publicKeyFingerprint: opts.publicKeyFingerprint,
          actionType: "argument",
          canonicalPayload: canonicalArgumentPayload({
            threadId: opts.threadId,
            userId: opts.userId,
            side: opts.side,
            body: opts.body,
            citationUrl: opts.citationUrl,
          }),
          signature: opts.signature,
          contextHash: opts.contextHash,
        });
      } catch {
        await client.query("ROLLBACK");
        return { prompted: false as const, signatureInvalid: true as const };
      }
    }
    const arg = await client.query(
      `INSERT INTO arguments (thread_id, user_id, side, format, body_text, moderation_status, signed_action_id)
       VALUES ($1, $2, $3, 'text', $4, 'pending', $5) RETURNING id`,
      [opts.threadId, opts.userId, opts.side, opts.body, signedActionId],
    );
    let citationId: string | null = null;
    if (opts.citationUrl) {
      const cit = await client.query(
        `INSERT INTO citations (url, archive_url, title, publisher, published_at)
         VALUES ($1, 'https://web.archive.org/web/0/' || $1, $2, split_part(regexp_replace($1, 'https?://', ''), '/', 1), CURRENT_DATE)
         RETURNING id`,
        [opts.citationUrl, opts.citationTitle ?? opts.citationUrl],
      );
      citationId = cit.rows[0].id;
      await client.query(
        `INSERT INTO argument_citations (argument_id, citation_id) VALUES ($1, $2)`,
        [arg.rows[0].id, citationId],
      );
    }
    if (claim) {
      await client.query(
        `INSERT INTO argument_claim_flags (argument_id, claim_text, detection_method, algorithm_version, author_response, resulting_citation_id)
         VALUES ($1, $2, 'model', $3, $4, $5)`,
        [
          arg.rows[0].id,
          claim,
          CLAIMS_ALGO,
          opts.citationUrl ? "added_citation" : opts.claimResponse,
          opts.citationUrl ? citationId : null,
        ],
      );
    }
    await client.query("COMMIT");
    return { prompted: false as const, id: arg.rows[0].id as string };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Audio/video arguments (ARCHITECTURE.md §9.1). A separate function from
    postArgument rather than one function branching heavily on format: the
    two have almost nothing in common — no claim-detection (nothing to scan
    text for), no citations, no signing yet (real non-repudiation over a
    file would need the client to hash the raw upload before transcoding
    and sign THAT, a genuine incremental feature — left unsigned for this
    first pass, same as the existing text-signing rollout already tolerates
    unsigned posts). Transcoding/validation lives in media.ts; this just
    handles the DB write once a file has already been saved to disk. */
export async function postMediaArgument(opts: {
  threadId: string;
  userId: string;
  side: "for" | "against" | "neutral_info";
  format: "audio" | "video";
  file: File;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; error: "too_long" | "too_large" | "invalid" | "processing_failed" | "rate_limited" }
> {
  // Checked BEFORE any file I/O or ffmpeg work -- a rate-limited user's
  // request should cost nothing, not write to disk and transcode first.
  const limit = await db().query(
    `SELECT count(*)::int AS n FROM arguments
      WHERE user_id = $1 AND format IN ('audio', 'video') AND created_at > now() - interval '24 hours'`,
    [opts.userId],
  );
  if (limit.rows[0].n >= MEDIA_RATE_LIMIT_PER_DAY) {
    return { ok: false, error: "rate_limited" };
  }

  const { saveMediaUpload, deleteMediaFile, MediaTooLongError, MediaTooLargeError, MediaInvalidError } =
    await import("./media");
  let saved: Awaited<ReturnType<typeof saveMediaUpload>>;
  try {
    saved = await saveMediaUpload(opts.file, opts.format);
  } catch (e) {
    if (e instanceof MediaTooLongError) return { ok: false, error: "too_long" };
    if (e instanceof MediaTooLargeError) return { ok: false, error: "too_large" };
    if (e instanceof MediaInvalidError) return { ok: false, error: "invalid" };
    return { ok: false, error: "processing_failed" };
  }
  try {
    if (opts.format === "video") {
      await db().query(
        `INSERT INTO arguments (id, thread_id, user_id, side, format, video_url, video_duration_seconds, video_size_bytes, moderation_status)
         VALUES ($1, $2, $3, $4, 'video', $5, $6, $7, 'pending')`,
        [saved.id, opts.threadId, opts.userId, opts.side, saved.url, saved.durationSeconds, saved.sizeBytes],
      );
    } else {
      await db().query(
        `INSERT INTO arguments (id, thread_id, user_id, side, format, audio_url, moderation_status)
         VALUES ($1, $2, $3, $4, 'audio', $5, 'pending')`,
        [saved.id, opts.threadId, opts.userId, opts.side, saved.url],
      );
    }
  } catch (e) {
    // Transcoding succeeded but the DB write failed — don't leave an orphaned file on disk.
    await deleteMediaFile(saved.id, opts.format);
    throw e;
  }
  return { ok: true, id: saved.id };
}

/* ── agreement votes (§10.2 private signal) ── */
export async function agreeVote(
  argumentId: string,
  userId: string,
  response: "agree" | "disagree" | "pass",
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_approved" | "thread_closed" }> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // debateDetail() already applies this same rule when LISTING arguments
    // (only approved is shown to other viewers, moved to a closed thread
    // means no more input) -- until now that was only enforced by the UI
    // not rendering the vote buttons in those cases, not by this route
    // itself, so a direct POST could vote on a pending/removed argument or
    // one whose debate had already closed. Confirmed live 2026-08-15 this
    // route had no such check at all before this.
    const check = await client.query(
      `SELECT a.moderation_status, ft.status AS thread_status
         FROM arguments a JOIN forum_threads ft ON ft.id = a.thread_id
        WHERE a.id = $1`,
      [argumentId],
    );
    if (check.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }
    if (check.rows[0].moderation_status !== "approved") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_approved" };
    }
    if (check.rows[0].thread_status !== "open") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "thread_closed" };
    }
    await client.query(
      `INSERT INTO argument_agreement_votes (argument_id, user_id, response)
       VALUES ($1, $2, $3)
       ON CONFLICT (argument_id, user_id) DO UPDATE SET response = EXCLUDED.response`,
      [argumentId, userId, response],
    );
    await client.query(
      `UPDATE arguments a SET
         agree_count = (SELECT count(*) FROM argument_agreement_votes v WHERE v.argument_id = a.id AND v.response = 'agree'),
         disagree_count = (SELECT count(*) FROM argument_agreement_votes v WHERE v.argument_id = a.id AND v.response = 'disagree'),
         pass_count = (SELECT count(*) FROM argument_agreement_votes v WHERE v.argument_id = a.id AND v.response = 'pass')
       WHERE a.id = $1`,
      [argumentId],
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Everyone who counts as an "active participant" in a thread -- posted an
    approved argument, or cast enough distinct agreement votes to clear the
    per-thread call_the_question_min_agreement_votes floor. Shared by
    ctqVote()'s eligibility/tally logic, debateDetail()'s ctq computation,
    and the notification fan-out below, so the definition of "active" can
    never drift between the three. */
async function activeParticipantIds(threadId: string): Promise<string[]> {
  const { rows } = await db().query(
    `WITH active AS (
       SELECT user_id FROM arguments WHERE thread_id = $1 AND moderation_status = 'approved'
       UNION
       SELECT v.user_id FROM argument_agreement_votes v JOIN arguments a ON a.id = v.argument_id
        WHERE a.thread_id = $1
        GROUP BY v.user_id
       HAVING count(*) >= (SELECT call_the_question_min_agreement_votes FROM forum_threads WHERE id = $1)
     )
     SELECT user_id FROM active`,
    [threadId],
  );
  return rows.map((r) => r.user_id as string);
}

/* ── calling the question (§7.6), restored with floors (2026-08-24,
   migration 094, reversing part of migration 093) ── Migration 093's
   finding stands: a supermajority vote with NO floor on group size let one
   person single-handedly close their own thread, cutting the fixed 14-day
   window short before latecomers had a real chance to weigh in. But the
   underlying capability -- a genuinely, broadly settled debate advancing
   before the full window -- is legitimate, not just a manipulation vector.
   Two floors, both required before the vote is even OFFERED (not just
   before it can succeed), close the actual gap instead of removing the
   feature outright: call_the_question_min_active (a real supermajority
   needs a real group) and call_the_question_min_open_hours (even a fast,
   legitimate supermajority can't close a thread before someone who checks
   the app every few days has had a real window). See ARCHITECTURE.md §12
   for the full writeup. */
export async function ctqVote(threadId: string, userId: string, requestContext?: { ip: string | null; contextHash: string | null }) {
  const client = await db().connect();
  // Declared outside the try so the post-commit notifyUsers() call below
  // (found live 2026-08-30) can run truly outside the transaction's own
  // try/catch -- it used to run INSIDE that try, after COMMIT, so a
  // notification hiccup there would hit the catch's ROLLBACK (a no-op on
  // an already-committed transaction) and rethrow, reporting a
  // successfully-closed thread to the caller as a failure. notifyUsers is
  // already meant to be best-effort/non-throwing on its own (see
  // notifications.ts's own "Never throws" doc comment, and the sibling fix
  // there for the one gap in that promise) -- this just also stops the
  // ACTION's own transaction from being blamed for it structurally,
  // regardless of whether notifyUsers ever throws in practice.
  let closed = false;
  let proposalId: string | null = null;
  let activeIds: string[] = [];
  try {
    await client.query("BEGIN");
    // Same gap class as agreeVote above: the debate page only renders the
    // "call the question" button while thread_status === "open" AND both
    // floors are met, but nothing here re-checked either server-side
    // before this -- a direct POST could add CTQ votes to an already-
    // closed thread, or to one that hasn't cleared the floors yet.
    const thread = await client.query(
      `SELECT status, opened_at, call_the_question_min_active AS min_active,
              call_the_question_min_open_hours AS min_hours,
              call_the_question_min_agreement_votes AS min_agreement_votes,
              close_early_threshold_pct AS pct
         FROM forum_threads WHERE id = $1 FOR UPDATE`,
      [threadId],
    );
    if (thread.rows[0]?.status !== "open") {
      await client.query("ROLLBACK");
      return { ok: false as const };
    }
    const t = thread.rows[0];
    const hoursOpen = (Date.now() - new Date(t.opened_at).getTime()) / 3600_000;

    activeIds = await activeParticipantIds(threadId);
    if (activeIds.length < t.min_active || hoursOpen < t.min_hours) {
      // Floors not met -- the mechanism isn't offered yet, regardless of
      // this specific user's own eligibility.
      await client.query("ROLLBACK");
      return { ok: false as const };
    }
    if (!activeIds.includes(userId)) {
      await client.query("ROLLBACK");
      return { ok: false as const };
    }
    await client.query(
      `INSERT INTO call_the_question_votes (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [threadId, userId],
    );
    if (requestContext) {
      const { flagIfAnomalous } = await import("./anomalyDetection");
      await flagIfAnomalous(client, {
        action: "call_the_question",
        userId,
        ip: requestContext.ip,
        contextHash: requestContext.contextHash,
      });
    }
    const voteCount = await client.query(`SELECT count(*)::float AS n FROM call_the_question_votes WHERE thread_id = $1`, [threadId]);
    const votes = voteCount.rows[0].n as number;
    if (activeIds.length > 0 && (votes / activeIds.length) * 100 >= t.pct) {
      const prop = await client.query(
        `UPDATE forum_threads SET status = 'closed', closed_early = TRUE, closed_early_at = now() WHERE id = $1
         RETURNING proposal_id`,
        [threadId],
      );
      proposalId = prop.rows[0].proposal_id as string;
      await client.query(`UPDATE issue_proposals SET status = 'referendum' WHERE id = $1`, [proposalId]);
      closed = true;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  // Outside the try/catch entirely now -- see this function's own header
  // comment above for why. Notified after COMMIT, same as before; the only
  // change is that a failure here can no longer be mistaken for the vote
  // itself failing.
  if (closed && proposalId) {
    const { notifyUsers } = await import("./notifications");
    await notifyUsers(activeIds, "thread_closed", { proposalId, threadId });
  }
  return { ok: true as const, closed };
}

/* ── thread reports + admin force-close (2026-08-24, migration 093) ──
   The SECOND early-closure path, alongside calling-the-question above:
   a human moderator's own judgment, triggered by a member report, for
   cases (spam, harassment) that aren't about debate being "settled" at
   all and so wouldn't be solved by any participant-vote mechanism no
   matter how it's floored. */

/** A member flagging a thread (not a single argument -- that's moderate()'s
    job) as abusive, e.g. it's devolved into spam/harassment across many
    posts. One open report per (thread, user); a repeat report from the same
    person is treated as a no-op, not an error -- it doesn't add signal, and
    a caller shouldn't need to special-case it in the UI. */
export async function reportThread(
  threadId: string,
  userId: string,
  reason: string,
  requestContext?: { ip: string | null; contextHash: string | null },
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "closed" }> {
  if (!reason.trim()) return { ok: false, reason: "invalid" };
  // Same gap class as ctqVote/agreeVote above: the UI only renders the
  // report form while thread_status === "open", but nothing here re-checked
  // server-side -- a direct POST could report an already-closed thread, and
  // the row would then be silently invisible to reportedThreadsQueue()'s own
  // `WHERE ft.status = 'open'` filter: it looks like it succeeded to the
  // reporter but never reaches a moderator.
  const thread = await db().query(`SELECT status FROM forum_threads WHERE id = $1`, [threadId]);
  if (thread.rows[0]?.status !== "open") return { ok: false, reason: "closed" };
  await db().query(
    `INSERT INTO thread_reports (thread_id, user_id, reason) VALUES ($1, $2, $3)
     ON CONFLICT (thread_id, user_id) DO NOTHING`,
    [threadId, userId, reason.trim().slice(0, 1000)],
  );
  if (requestContext) {
    const { flagIfAnomalous } = await import("./anomalyDetection");
    await flagIfAnomalous(db(), {
      action: "thread_report",
      userId,
      ip: requestContext.ip,
      contextHash: requestContext.contextHash,
    });
  }
  return { ok: true };
}

/** Admin queue (mirrors moderationQueue()'s shape/intent): open threads with
    at least one outstanding report, most-reported first. Closed threads are
    excluded -- once a thread's already closed (naturally or force-closed),
    there's nothing left for an admin to act on. */
export async function reportedThreadsQueue() {
  const { rows } = await db().query(
    `SELECT ft.id AS thread_id, ft.opened_at::date::text AS opened, ft.closes_at::date::text AS closes,
            p.id AS proposal_id, p.title AS proposal,
            count(tr.*)::int AS report_count,
            array_agg(tr.reason ORDER BY tr.created_at DESC) AS reasons,
            max(tr.created_at) AS last_reported_at
       FROM thread_reports tr
       JOIN forum_threads ft ON ft.id = tr.thread_id
       JOIN issue_proposals p ON p.id = ft.proposal_id
      WHERE ft.status = 'open'
      GROUP BY ft.id, p.id, p.title
      ORDER BY count(tr.*) DESC, max(tr.created_at) DESC`,
  );
  return rows as {
    thread_id: string; opened: string; closes: string;
    proposal_id: string; proposal: string;
    report_count: number; reasons: string[]; last_reported_at: string;
  }[];
}

/** Ends a debate thread before its natural closes_at date on an admin's own
    judgment (reachable from the reported-threads queue, but not restricted
    to only reported threads -- a real moderation case doesn't always start
    with a member report). Same downstream effect the old vote-based
    ctqVote() had (advance the proposal to 'referendum'), reached by a
    person's decision instead of a headcount. reason is required -- an
    unexplained early close has no audit trail. */
export async function forceCloseThread(
  threadId: string,
  adminUsername: string,
  reason: string,
): Promise<{ ok: true } | { ok: false }> {
  const client = await db().connect();
  let proposalId: string | null = null;
  try {
    await client.query("BEGIN");
    const t = await client.query(`SELECT status, proposal_id FROM forum_threads WHERE id = $1 FOR UPDATE`, [threadId]);
    if (!t.rows[0] || t.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      return { ok: false };
    }
    proposalId = t.rows[0].proposal_id as string;
    await client.query(
      `UPDATE forum_threads
          SET status = 'closed', closed_early = TRUE, closed_early_at = now(),
              closed_by_admin = $2, closed_reason = $3
        WHERE id = $1`,
      [threadId, adminUsername, reason.trim().slice(0, 1000)],
    );
    await client.query(`UPDATE issue_proposals SET status = 'referendum' WHERE id = $1`, [proposalId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  // Notified after COMMIT, outside the transaction -- a best-effort push/
  // email failure (notifications.ts never throws) must never roll back a
  // real moderation action that already succeeded. Active participants AND
  // the thread's reporters -- a reporter isn't necessarily an active
  // participant themselves (they may have only read the thread, never
  // argued or voted in it), but they specifically asked for this outcome
  // and should hear it happened.
  const [activeIds, reporterRows] = await Promise.all([
    activeParticipantIds(threadId),
    db().query(`SELECT user_id FROM thread_reports WHERE thread_id = $1`, [threadId]),
  ]);
  const { notifyUsers } = await import("./notifications");
  await notifyUsers(
    [...activeIds, ...reporterRows.rows.map((r) => r.user_id as string)],
    "thread_closed",
    { proposalId: proposalId!, threadId, detail: reason },
  );
  return { ok: true };
}

/* ── moderation (admin) ── */
export async function moderationQueue() {
  const { rows } = await db().query(
    `SELECT a.id, a.side, a.body_text, a.format, a.audio_url, a.video_url,
            a.created_at::date::text AS date, COALESCE(u.display_name, 'Resident') AS display_name,
            p.title AS proposal,
            (SELECT cf.author_response FROM argument_claim_flags cf WHERE cf.argument_id = a.id LIMIT 1) AS claim_response,
            (SELECT cf.claim_text FROM argument_claim_flags cf WHERE cf.argument_id = a.id LIMIT 1) AS claim_text
       FROM arguments a
       JOIN users u ON u.id = a.user_id
       JOIN forum_threads ft ON ft.id = a.thread_id
       JOIN issue_proposals p ON p.id = ft.proposal_id
      WHERE a.moderation_status = 'pending'
      ORDER BY a.created_at`,
  );
  return rows as {
    id: string; side: string; body_text: string | null; format: string;
    audio_url: string | null; video_url: string | null;
    date: string; display_name: string;
    proposal: string; claim_response: string | null; claim_text: string | null;
  }[];
}

export async function moderate(argumentId: string, decision: "approved" | "removed") {
  await db().query(`UPDATE arguments SET moderation_status = $2 WHERE id = $1`, [argumentId, decision]);
}
