import { db } from "./db";

/* Phase 3: proposals → seconding → text debate. Clustering, amendments, and media
   formats are volume-triggered later features (ARCHITECTURE.md §12 Phase 3 note). */

const SECOND_THRESHOLD = 3; // pilot-scale; production scales to jurisdiction size
const CTQ_PCT = 66.7; // matches forum_threads.close_early_threshold_pct default
export const CLAIMS_ALGO = "claims-heuristic-v0.1";

/* ── verification tier (§9 gate; §2.6 self-attested + format-verified) ── */
export async function userTier(userId: string): Promise<string> {
  const { rows } = await db().query(`SELECT verification_tier FROM users WHERE id = $1`, [userId]);
  return rows[0]?.verification_tier ?? "unverified";
}

export function addressLooksValid(address: string): boolean {
  // Dev-grade format check standing in for the geocoding vendor (§2.6): a street
  // number, a street name, and something county-plausible. Never matched against
  // any voter file.
  return /\d+\s+\S+.*\s+(md|maryland)\b/i.test(address.trim()) && address.trim().length >= 12;
}

export async function verifyAddress(userId: string, address: string): Promise<boolean> {
  if (!addressLooksValid(address)) return false;
  const { resolveJurisdictionFromAddress, RESOLVER_VERSION } = await import("./jurisdictions");
  const residence = resolveJurisdictionFromAddress(address);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO verification_records (user_id, method, provider_reference, expires_at)
       VALUES ($1, 'address_attestation', $2, now() + interval '1 year')`,
      [userId, `format-check-v0.1+${RESOLVER_VERSION}`],
    );
    await client.query(
      `UPDATE users SET verification_tier = 'address_verified'
        WHERE id = $1 AND verification_tier IN ('unverified', 'email_verified')`,
      [userId],
    );
    // The resolved jurisdiction always follows the latest verified address —
    // moving from Silver Spring to Rockville changes what your address elects.
    await client.query(`UPDATE users SET residence_jurisdiction_id = $2 WHERE id = $1`, [userId, residence]);
    await client.query("COMMIT");
    return true;
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

export async function createProposal(userId: string, topicId: string, title: string, body: string) {
  const { rows } = await db().query(
    `INSERT INTO issue_proposals (created_by_user_id, jurisdiction_id, topic_id, title, body, second_threshold)
     VALUES ($1, 'ocd-division/country:us/state:md/county:montgomery', $2, $3, $4, $5)
     RETURNING id`,
    [userId, topicId, title, body, SECOND_THRESHOLD],
  );
  return rows[0].id as string;
}

/* ── seconding (public act) ── */
export async function secondProposal(proposalId: string, userId: string, tier: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO seconds (proposal_id, user_id, verification_tier_at_second)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [proposalId, userId, tier],
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
      `SELECT a.id, a.side, a.body_text, a.moderation_status, a.created_at::date::text AS date,
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
}) {
  const claim = detectClaim(opts.body);
  if (claim && !opts.claimResponse && !opts.citationUrl) {
    return { prompted: true as const, claim };
  }
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const arg = await client.query(
      `INSERT INTO arguments (thread_id, user_id, side, format, body_text, moderation_status)
       VALUES ($1, $2, $3, 'text', $4, 'pending') RETURNING id`,
      [opts.threadId, opts.userId, opts.side, opts.body],
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

/* ── agreement votes (§10.2 private signal) ── */
export async function agreeVote(argumentId: string, userId: string, response: "agree" | "disagree" | "pass") {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
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
    `SELECT a.id, a.side, a.body_text, a.created_at::date::text AS date, COALESCE(u.display_name, 'Resident') AS display_name,
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
    id: string; side: string; body_text: string; date: string; display_name: string;
    proposal: string; claim_response: string | null; claim_text: string | null;
  }[];
}

export async function moderate(argumentId: string, decision: "approved" | "removed") {
  await db().query(`UPDATE arguments SET moderation_status = $2 WHERE id = $1`, [argumentId, decision]);
}
