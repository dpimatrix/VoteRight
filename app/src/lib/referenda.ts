import { db } from "./db";

/* Phase 4: advisory referenda → ballot tokens → voter mandates → candidate
   commitments (ARCHITECTURE.md §7.3, §7.9, §10.1). Accountability pathways
   (§7.4) remain a later slice of this phase.

   §10.1 CODE-PATH DISCIPLINE: nothing in this module may log, trace, or persist
   a (user, choice) pair. Identity lives only on referendum_ballot_tokens;
   choice lives only on referendum_ballots keyed by token. Keep it that way. */

const COUNTY = "ocd-division/country:us/state:md/county:montgomery";

/* ── tally (pure — unit-tested) ── */
export interface TallyCount {
  choice: string;
  n: number;
}
export interface TallyResult {
  counts: TallyCount[]; // every declared option, highest count first (declared order breaks ties)
  total: number;
  leading: string | null; // null when no ballots
  margin_pct: number; // (leading − runner-up) / total × 100, 2 decimals
}

export function computeTally(options: string[], ballots: TallyCount[]): TallyResult {
  const byChoice = new Map(ballots.map((b) => [b.choice, b.n]));
  const counts = options
    .map((choice) => ({ choice, n: byChoice.get(choice) ?? 0 }))
    .sort((a, b) => b.n - a.n || options.indexOf(a.choice) - options.indexOf(b.choice));
  const total = counts.reduce((s, c) => s + c.n, 0);
  if (total === 0) return { counts, total: 0, leading: null, margin_pct: 0 };
  const second = counts[1]?.n ?? 0;
  const margin_pct = Math.round(((counts[0].n - second) / total) * 10000) / 100;
  return { counts, total, leading: counts[0].choice, margin_pct };
}

/* ── lazy time-based transitions (scheduled→open→closed) ── */
async function syncStatuses() {
  await db().query(`UPDATE referenda SET status = 'open' WHERE status = 'scheduled' AND opens_at <= now()`);
  await db().query(`UPDATE referenda SET status = 'closed' WHERE status = 'open' AND closes_at <= now()`);
}

/* ── voter-facing lists ── */
export async function listReferenda(userId: string | null) {
  await syncStatuses();
  const { rows } = await db().query(
    `SELECT r.id, r.question_text, r.status, r.opens_at::date::text AS opens, r.closes_at::date::text AS closes,
            p.title AS proposal_title, t.name AS topic,
            (SELECT count(*)::int FROM referendum_ballots b WHERE b.referendum_id = r.id) AS ballots,
            EXISTS (SELECT 1 FROM referendum_ballot_tokens tk
                     WHERE tk.referendum_id = r.id AND tk.user_id = $1 AND tk.redeemed_at IS NOT NULL) AS voted,
            EXISTS (SELECT 1 FROM voter_mandates m WHERE m.referendum_id = r.id) AS certified
       FROM referenda r
       JOIN issue_proposals p ON p.id = r.proposal_id
       JOIN topics t ON t.id = p.topic_id
      ORDER BY (r.status = 'open') DESC, r.closes_at DESC`,
    [userId],
  );
  return rows as {
    id: string; question_text: string; status: string; opens: string; closes: string;
    proposal_title: string; topic: string; ballots: number; voted: boolean; certified: boolean;
  }[];
}

export async function listMandates() {
  const { rows } = await db().query(
    `SELECT m.id, m.mandate_summary, m.turnout_count, m.margin_pct::float AS margin_pct,
            m.turnout_pct_of_registered::float AS turnout_pct, m.publish_threshold_pct::float AS threshold_pct,
            m.overlay_status, m.published_at::date::text AS published,
            o.title AS office, r.question_text,
            (SELECT count(*)::int FROM mandate_commitments mc WHERE mc.voter_mandate_id = m.id AND mc.stance = 'commit') AS commits,
            (SELECT count(*)::int FROM mandate_commitments mc WHERE mc.voter_mandate_id = m.id AND mc.stance = 'decline') AS declines,
            (SELECT count(*)::int FROM mandate_commitments mc WHERE mc.voter_mandate_id = m.id AND mc.stance = 'no_response') AS no_responses
       FROM voter_mandates m
       LEFT JOIN offices o ON o.id = m.office_id
       JOIN referenda r ON r.id = m.referendum_id
      ORDER BY (m.overlay_status <> 'below_threshold_unpublished') DESC, m.published_at DESC NULLS LAST`,
  );
  return rows as {
    id: string; mandate_summary: string; turnout_count: number; margin_pct: number;
    turnout_pct: number | null; threshold_pct: number; overlay_status: string; published: string | null;
    office: string | null; question_text: string; commits: number; declines: number; no_responses: number;
  }[];
}

/* ── referendum detail + voting ── */
export async function referendumDetail(id: string, userId: string | null) {
  await syncStatuses();
  const r = await db().query(
    `SELECT r.id, r.question_text, r.options, r.status, r.disclosure_text,
            r.opens_at::date::text AS opens, r.closes_at::date::text AS closes,
            p.id AS proposal_id, p.title AS proposal_title, p.body AS proposal_body, t.name AS topic,
            (SELECT count(*)::int FROM referendum_ballots b WHERE b.referendum_id = r.id) AS ballots,
            tk.id AS my_token, (tk.redeemed_at IS NOT NULL) AS voted,
            m.id AS mandate_id, m.overlay_status
       FROM referenda r
       JOIN issue_proposals p ON p.id = r.proposal_id
       JOIN topics t ON t.id = p.topic_id
       LEFT JOIN referendum_ballot_tokens tk ON tk.referendum_id = r.id AND tk.user_id = $2
       LEFT JOIN voter_mandates m ON m.referendum_id = r.id
      WHERE r.id = $1`,
    [id, userId],
  );
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  const options: string[] = Array.isArray(row.options) ? row.options : JSON.parse(row.options);
  // Per-option results are shown only after voting closes — a live scoreboard on an
  // open advisory poll invites bandwagon/manipulation dynamics (§9) and makes the
  // "this is not an official election" line (§2.4) harder to hold.
  let results: TallyResult | null = null;
  if (row.status === "closed" || row.status === "published") {
    const b = await db().query(
      `SELECT choice, count(*)::int AS n FROM referendum_ballots WHERE referendum_id = $1 GROUP BY choice`,
      [id],
    );
    results = computeTally(options, b.rows);
  }
  return { ...row, options, results };
}

export async function referendumForProposal(proposalId: string): Promise<{ id: string; status: string } | null> {
  const { rows } = await db().query(`SELECT id, status FROM referenda WHERE proposal_id = $1`, [proposalId]);
  return (rows[0] as { id: string; status: string } | undefined) ?? null;
}

/** Step 1 (§7.3): identity is checked once and a single-use token issued. */
export async function issueBallot(refId: string, userId: string, tier: string): Promise<"ok" | "not_open" | "not_eligible"> {
  await syncStatuses();
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const chk = await client.query(
      `SELECT r.status, r.eligibility_jurisdiction_id, u.residence_jurisdiction_id
         FROM referenda r, users u WHERE r.id = $1 AND u.id = $2`,
      [refId, userId],
    );
    const c = chk.rows[0];
    if (!c || c.status !== "open") {
      await client.query("ROLLBACK");
      return "not_open";
    }
    if (c.residence_jurisdiction_id !== c.eligibility_jurisdiction_id) {
      await client.query("ROLLBACK");
      return "not_eligible";
    }
    await client.query(
      `INSERT INTO referendum_ballot_tokens (referendum_id, user_id, verification_tier_at_issuance)
       VALUES ($1, $2, $3) ON CONFLICT (referendum_id, user_id) DO NOTHING`,
      [refId, userId, tier],
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

/** Step 2 (§7.3): the choice is written against the token, never the user.
    The ballot INSERT below is the only statement that sees the choice, and it
    carries no user id; the schema trigger validates the option. */
export async function castBallot(refId: string, userId: string, choice: string): Promise<"ok" | "no_token" | "already" | "closed"> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const st = await client.query(`SELECT status FROM referenda WHERE id = $1`, [refId]);
    if (st.rows[0]?.status !== "open") {
      await client.query("ROLLBACK");
      return "closed";
    }
    const tok = await client.query(
      `SELECT id, redeemed_at FROM referendum_ballot_tokens
        WHERE referendum_id = $1 AND user_id = $2 FOR UPDATE`,
      [refId, userId],
    );
    if (tok.rowCount === 0) {
      await client.query("ROLLBACK");
      return "no_token";
    }
    if (tok.rows[0].redeemed_at) {
      await client.query("ROLLBACK");
      return "already";
    }
    await client.query(`INSERT INTO referendum_ballots (referendum_id, ballot_token_id, choice) VALUES ($1, $2, $3)`, [
      refId,
      tok.rows[0].id,
      choice,
    ]);
    await client.query(`UPDATE referendum_ballot_tokens SET redeemed_at = now() WHERE id = $1`, [tok.rows[0].id]);
    await client.query("COMMIT");
    return "ok";
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/* ── mandate detail (voter-facing commitment grid, §7.9) ── */
export async function mandateDetail(id: string) {
  const m = await db().query(
    `SELECT m.id, m.mandate_summary, m.turnout_count, m.margin_pct::float AS margin_pct,
            m.turnout_pct_of_registered::float AS turnout_pct, m.publish_threshold_pct::float AS threshold_pct,
            m.overlay_status, m.published_at::date::text AS published,
            o.title AS office, r.id AS referendum_id, r.question_text, r.options, r.disclosure_text,
            p.title AS proposal_title
       FROM voter_mandates m
       LEFT JOIN offices o ON o.id = m.office_id
       JOIN referenda r ON r.id = m.referendum_id
       JOIN issue_proposals p ON p.id = r.proposal_id
      WHERE m.id = $1`,
    [id],
  );
  if (m.rowCount === 0) return null;
  const row = m.rows[0];
  const c = await db().query(
    `SELECT mc.id, mc.stance, mc.statement, mc.recorded_at::date::text AS date,
            pol.id AS politician_id, pol.full_name, cd.party, ec.name AS cycle,
            cit.publisher, cit.title AS cit_title,
            (mc.resulting_promise_id IS NOT NULL) AS became_promise
       FROM mandate_commitments mc
       JOIN candidacies cd ON cd.id = mc.candidacy_id
       JOIN politicians pol ON pol.id = cd.politician_id
       JOIN races ra ON ra.id = cd.race_id
       JOIN election_cycles ec ON ec.id = ra.election_cycle_id
       LEFT JOIN citations cit ON cit.id = mc.citation_id
      WHERE mc.voter_mandate_id = $1
      ORDER BY (mc.stance = 'commit') DESC, (mc.stance = 'decline') DESC, pol.full_name`,
    [id],
  );
  const b = await db().query(
    `SELECT choice, count(*)::int AS n FROM referendum_ballots WHERE referendum_id = $1 GROUP BY choice`,
    [row.referendum_id],
  );
  const options: string[] = Array.isArray(row.options) ? row.options : JSON.parse(row.options);
  return { ...row, options, commitments: c.rows, results: computeTally(options, b.rows) };
}

export async function commitmentsFor(politicianId: string) {
  const { rows } = await db().query(
    `SELECT mc.id, mc.stance, mc.statement, mc.recorded_at::date::text AS date,
            m.id AS mandate_id, m.mandate_summary, m.turnout_count, m.margin_pct::float AS margin_pct,
            o.title AS office, cit.publisher, cit.title AS cit_title,
            (mc.resulting_promise_id IS NOT NULL) AS became_promise
       FROM mandate_commitments mc
       JOIN candidacies cd ON cd.id = mc.candidacy_id
       JOIN voter_mandates m ON m.id = mc.voter_mandate_id
       LEFT JOIN offices o ON o.id = m.office_id
       LEFT JOIN citations cit ON cit.id = mc.citation_id
      WHERE cd.politician_id = $1 AND m.overlay_status <> 'below_threshold_unpublished'
      ORDER BY mc.recorded_at DESC`,
    [politicianId],
  );
  return rows as {
    id: string; stance: string; statement: string | null; date: string;
    mandate_id: string; mandate_summary: string; turnout_count: number; margin_pct: number;
    office: string | null; publisher: string | null; cit_title: string | null; became_promise: boolean;
  }[];
}

/* ══════════════ admin (paired tooling, internal register) ══════════════ */

export async function scheduleReferendum(proposalId: string, question: string, opensAt: string, closesAt: string) {
  await db().query(
    `INSERT INTO referenda (proposal_id, question_text, opens_at, closes_at, eligibility_jurisdiction_id)
     VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)`,
    [proposalId, question, opensAt, closesAt, COUNTY],
  );
  await syncStatuses(); // an opens_at in the past goes live immediately
}

export async function closeReferendumNow(refId: string) {
  await db().query(
    `UPDATE referenda SET closes_at = now(), status = 'closed' WHERE id = $1 AND status IN ('scheduled', 'open')`,
    [refId],
  );
}

/** Tally + certify (§7.3): computes turnout against the official registered-voter
    denominator and records the mandate UNPUBLISHED — publishing is a separate,
    threshold-gated act. */
export async function certifyReferendum(refId: string, officeId: string, summary: string, thresholdPct: number) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `SELECT r.status, r.options, j.registered_voter_count
         FROM referenda r JOIN jurisdictions j ON j.ocd_id = r.eligibility_jurisdiction_id
        WHERE r.id = $1 FOR UPDATE OF r`,
      [refId],
    );
    if (r.rows[0]?.status !== "closed") {
      await client.query("ROLLBACK");
      return { ok: false as const, reason: "not_closed" };
    }
    const options: string[] = Array.isArray(r.rows[0].options) ? r.rows[0].options : JSON.parse(r.rows[0].options);
    const b = await client.query(
      `SELECT choice, count(*)::int AS n FROM referendum_ballots WHERE referendum_id = $1 GROUP BY choice`,
      [refId],
    );
    const tally = computeTally(options, b.rows);
    const registered: number | null = r.rows[0].registered_voter_count;
    const turnoutPct = registered ? Math.round((tally.total / registered) * 100000) / 1000 : null;
    const meets = turnoutPct !== null && turnoutPct >= thresholdPct;
    const ins = await client.query(
      `INSERT INTO voter_mandates
         (referendum_id, office_id, mandate_summary, turnout_count, margin_pct,
          turnout_pct_of_registered, publish_threshold_pct, meets_publish_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [refId, officeId, summary, tally.total, tally.margin_pct, turnoutPct, thresholdPct, meets],
    );
    await client.query("COMMIT");
    return { ok: true as const, mandateId: ins.rows[0].id as string, meets, tally };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Publish (threshold-gated by the schema CHECK) + create the §7.9 commitment
    rows for every active candidacy in upcoming races for the mandate's office. */
export async function publishMandate(mandateId: string): Promise<"ok" | "blocked" | "not_found"> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const m = await client.query(
      `SELECT referendum_id, office_id, meets_publish_threshold, overlay_status
         FROM voter_mandates WHERE id = $1 FOR UPDATE`,
      [mandateId],
    );
    if (m.rowCount === 0) {
      await client.query("ROLLBACK");
      return "not_found";
    }
    if (!m.rows[0].meets_publish_threshold) {
      // The CHECK constraint is the real gate; this early return keeps the
      // admin flow readable instead of surfacing a constraint violation.
      await client.query("ROLLBACK");
      return "blocked";
    }
    await client.query(
      `UPDATE voter_mandates SET overlay_status = 'published', published_at = COALESCE(published_at, now()) WHERE id = $1`,
      [mandateId],
    );
    await client.query(`UPDATE referenda SET status = 'published' WHERE id = $1`, [m.rows[0].referendum_id]);
    await client.query(
      `UPDATE issue_proposals SET status = 'closed'
        WHERE id = (SELECT proposal_id FROM referenda WHERE id = $1)`,
      [m.rows[0].referendum_id],
    );
    if (m.rows[0].office_id) {
      await client.query(
        `INSERT INTO mandate_commitments (voter_mandate_id, candidacy_id)
         SELECT $1, cd.id
           FROM candidacies cd
           JOIN races ra ON ra.id = cd.race_id
           JOIN election_cycles ec ON ec.id = ra.election_cycle_id
          WHERE ra.office_id = $2 AND cd.status = 'active' AND ec.election_date >= CURRENT_DATE
         ON CONFLICT (voter_mandate_id, candidacy_id) DO NOTHING`,
        [mandateId, m.rows[0].office_id],
      );
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

/** Record a candidate's on-the-record answer. Any attributed stance requires the
    candidate's own public statement as a citation (schema CHECK; §2.3). */
export async function recordCommitment(opts: {
  commitmentId: string;
  stance: "commit" | "decline" | "no_response";
  statement?: string;
  citationUrl?: string;
  citationTitle?: string;
}): Promise<"ok" | "needs_citation"> {
  if (opts.stance !== "no_response" && !opts.citationUrl) return "needs_citation";
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    let citationId: string | null = null;
    if (opts.citationUrl) {
      const cit = await client.query(
        `INSERT INTO citations (url, archive_url, title, publisher, published_at)
         VALUES ($1, 'https://web.archive.org/web/0/' || $1, $2, split_part(regexp_replace($1, 'https?://', ''), '/', 1), CURRENT_DATE)
         RETURNING id`,
        [opts.citationUrl, opts.citationTitle ?? opts.citationUrl],
      );
      citationId = cit.rows[0].id;
    }
    await client.query(
      `UPDATE mandate_commitments SET stance = $2, statement = $3, citation_id = $4, recorded_at = now() WHERE id = $1`,
      [opts.commitmentId, opts.stance, opts.statement ?? null, citationId],
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

/** §7.9 step 4: record who won; every 'commit' from a winner becomes a tracked
    promise, and the existing promise machinery takes over. */
export async function recordRaceOutcome(raceId: string, wonCandidacyIds: string[]) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE candidacies SET status = CASE WHEN id = ANY($2::uuid[]) THEN 'won' ELSE 'lost' END
        WHERE race_id = $1 AND status <> 'withdrawn'`,
      [raceId, wonCandidacyIds],
    );
    const commits = await client.query(
      `SELECT mc.id, mc.statement, mc.citation_id, m.mandate_summary, p.topic_id, cd.politician_id
         FROM mandate_commitments mc
         JOIN candidacies cd ON cd.id = mc.candidacy_id
         JOIN voter_mandates m ON m.id = mc.voter_mandate_id
         JOIN referenda r ON r.id = m.referendum_id
         JOIN issue_proposals p ON p.id = r.proposal_id
        WHERE cd.race_id = $1 AND cd.status = 'won' AND mc.stance = 'commit' AND mc.resulting_promise_id IS NULL`,
      [raceId],
    );
    let created = 0;
    for (const row of commits.rows) {
      const pr = await client.query(
        `INSERT INTO promises (politician_id, topic_id, statement, made_at, origin_citation_id, current_status)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, 'pending') RETURNING id`,
        [row.politician_id, row.topic_id, row.statement ?? `Carry out the voter mandate: ${row.mandate_summary}`, row.citation_id],
      );
      await client.query(
        `INSERT INTO promise_status_events (promise_id, status, citation_id, note)
         VALUES ($1, 'pending', $2, 'Created from a pre-election mandate commitment — the winner answered this mandate on the record before the vote.')`,
        [pr.rows[0].id, row.citation_id],
      );
      await client.query(`UPDATE mandate_commitments SET resulting_promise_id = $2 WHERE id = $1`, [row.id, pr.rows[0].id]);
      created++;
    }
    await client.query("COMMIT");
    return created;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** §10.1 retention: sever identity from the token ledger once the mandate is
    published. (Production adds a fixed audit/dispute window before this runs;
    at pilot scale the admin performs it explicitly.) */
export async function redactReferendumIdentities(refId: string): Promise<number | "not_published"> {
  const m = await db().query(
    `SELECT 1 FROM voter_mandates WHERE referendum_id = $1 AND overlay_status <> 'below_threshold_unpublished'`,
    [refId],
  );
  if (m.rowCount === 0) return "not_published";
  const res = await db().query(
    `UPDATE referendum_ballot_tokens SET user_id = NULL WHERE referendum_id = $1 AND user_id IS NOT NULL`,
    [refId],
  );
  return res.rowCount ?? 0;
}

/* ── admin console data ── */
export async function adminMandatePipeline() {
  await syncStatuses();
  const ready = await db().query(
    `SELECT p.id, p.title, t.name AS topic
       FROM issue_proposals p JOIN topics t ON t.id = p.topic_id
      WHERE p.status = 'referendum' AND NOT EXISTS (SELECT 1 FROM referenda r WHERE r.proposal_id = p.id)
      ORDER BY p.created_at`,
  );
  const referenda = await db().query(
    `SELECT r.id, r.question_text, r.status, r.opens_at::text AS opens, r.closes_at::text AS closes,
            p.title AS proposal_title,
            (SELECT count(*)::int FROM referendum_ballots b WHERE b.referendum_id = r.id) AS ballots,
            (SELECT count(*)::int FROM referendum_ballot_tokens tk WHERE tk.referendum_id = r.id) AS tokens,
            (SELECT count(*)::int FROM referendum_ballot_tokens tk WHERE tk.referendum_id = r.id AND tk.user_id IS NOT NULL) AS unredacted,
            EXISTS (SELECT 1 FROM voter_mandates m WHERE m.referendum_id = r.id) AS certified
       FROM referenda r JOIN issue_proposals p ON p.id = r.proposal_id
      ORDER BY r.closes_at DESC`,
  );
  const mandates = await db().query(
    `SELECT m.id, m.mandate_summary, m.turnout_count, m.margin_pct::float AS margin_pct,
            m.turnout_pct_of_registered::float AS turnout_pct, m.publish_threshold_pct::float AS threshold_pct,
            m.meets_publish_threshold, m.overlay_status, m.referendum_id,
            o.title AS office, r.question_text
       FROM voter_mandates m
       LEFT JOIN offices o ON o.id = m.office_id
       JOIN referenda r ON r.id = m.referendum_id
      ORDER BY m.published_at DESC NULLS FIRST`,
  );
  const offices = await db().query(
    `SELECT id, title FROM offices WHERE is_elected AND level <> 'judicial' ORDER BY title`,
  );
  const commitments = await db().query(
    `SELECT mc.id, mc.stance, pol.full_name, cd.party, m.mandate_summary, o.title AS office
       FROM mandate_commitments mc
       JOIN candidacies cd ON cd.id = mc.candidacy_id
       JOIN politicians pol ON pol.id = cd.politician_id
       JOIN voter_mandates m ON m.id = mc.voter_mandate_id
       LEFT JOIN offices o ON o.id = m.office_id
      WHERE mc.stance = 'no_response' AND mc.resulting_promise_id IS NULL
      ORDER BY m.id, pol.full_name`,
  );
  const races = await db().query(
    `SELECT ra.id, o.title AS office, ec.name AS cycle, ra.seats_elected,
            json_agg(json_build_object('candidacy_id', cd.id, 'name', pol.full_name, 'party', cd.party, 'status', cd.status)
                     ORDER BY pol.full_name) AS candidacies
       FROM races ra
       JOIN offices o ON o.id = ra.office_id
       JOIN election_cycles ec ON ec.id = ra.election_cycle_id
       JOIN candidacies cd ON cd.race_id = ra.id
       JOIN politicians pol ON pol.id = cd.politician_id
      WHERE EXISTS (SELECT 1 FROM mandate_commitments mc JOIN candidacies c2 ON c2.id = mc.candidacy_id WHERE c2.race_id = ra.id)
      GROUP BY ra.id, o.title, ec.name, ra.seats_elected`,
  );
  return {
    ready: ready.rows,
    referenda: referenda.rows,
    mandates: mandates.rows,
    offices: offices.rows,
    commitments: commitments.rows,
    races: races.rows,
  };
}
