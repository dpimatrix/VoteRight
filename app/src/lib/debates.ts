import { db } from "./db";

/* Phase 3: proposals → seconding → text debate. Clustering, amendments, and media
   formats are volume-triggered later features (ARCHITECTURE.md §12 Phase 3 note). */

const SECOND_THRESHOLD = 3; // pilot-scale; production scales to jurisdiction size
const CTQ_PCT = 66.7; // matches forum_threads.close_early_threshold_pct default
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
): Promise<"ok" | "bad_format" | "no_match" | "outside" | "resolver_unavailable"> {
  if (!addressLooksValid(address)) return "bad_format";
  const { resolveJurisdiction } = await import("./jurisdictions");
  const res = await resolveJurisdiction(address);
  if (res.outcome !== "ok") return res.outcome;
  const residence = res.jurisdiction;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO verification_records (user_id, method, provider_reference, expires_at)
       VALUES ($1, 'address_attestation', $2, now() + interval '1 year')`,
      [userId, `format-check-v0.1+${res.method}`],
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
            ft.id AS thread_id, ft.closes_at::date::text AS closes, ft.closed_early, ft.status AS thread_status,
            ft.close_early_threshold_pct::float AS ctq_pct, ft.call_the_question_min_agreement_votes AS ctq_min
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
      [row.thread_id, userId, row.ctq_min],
    );
    ctq = c.rows[0];
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

/* ── calling the question (§7.6) ── */
export async function ctqVote(threadId: string, userId: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Same gap class as agreeVote above: the debate page only renders the
    // "call the question" button while thread_status === "open", but
    // nothing here re-checked that server-side before this -- a direct POST
    // could add CTQ votes to an already-closed thread.
    const thread = await client.query(`SELECT status FROM forum_threads WHERE id = $1`, [threadId]);
    if (thread.rows[0]?.status !== "open") {
      await client.query("ROLLBACK");
      return { ok: false as const };
    }
    const elig = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM arguments WHERE thread_id = $1 AND user_id = $2 AND moderation_status = 'approved'
         UNION ALL
         SELECT 1 FROM (
           SELECT 1 FROM argument_agreement_votes v JOIN arguments a ON a.id = v.argument_id
            WHERE a.thread_id = $1 AND v.user_id = $2
            GROUP BY v.user_id
           HAVING count(*) >= (SELECT call_the_question_min_agreement_votes FROM forum_threads WHERE id = $1)
         ) q
       ) AS ok`,
      [threadId, userId],
    );
    if (!elig.rows[0].ok) {
      await client.query("ROLLBACK");
      return { ok: false as const };
    }
    await client.query(
      `INSERT INTO call_the_question_votes (thread_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [threadId, userId],
    );
    const s = await client.query(
      `WITH active AS (
         SELECT user_id FROM arguments WHERE thread_id = $1 AND moderation_status = 'approved'
         UNION
         SELECT v.user_id FROM argument_agreement_votes v JOIN arguments a ON a.id = v.argument_id
          WHERE a.thread_id = $1
          GROUP BY v.user_id
         HAVING count(*) >= (SELECT call_the_question_min_agreement_votes FROM forum_threads WHERE id = $1)
       )
       SELECT (SELECT count(*)::float FROM call_the_question_votes WHERE thread_id = $1) AS votes,
              (SELECT count(*)::float FROM active) AS active`,
      [threadId],
    );
    const { votes, active } = s.rows[0];
    let closed = false;
    if (active > 0 && (votes / active) * 100 >= CTQ_PCT) {
      await client.query(
        `UPDATE forum_threads SET status = 'closed', closed_early = TRUE, closed_early_at = now() WHERE id = $1`,
        [threadId],
      );
      await client.query(
        `UPDATE issue_proposals SET status = 'referendum'
          WHERE id = (SELECT proposal_id FROM forum_threads WHERE id = $1)`,
        [threadId],
      );
      closed = true;
    }
    await client.query("COMMIT");
    return { ok: true as const, closed };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
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
