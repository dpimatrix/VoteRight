import { db } from "./db";

/* Vote → position admin tool (DATA-OPS D2→D4 bridge). Turning a recorded vote
   into a scored position is the interpretive step — which bill maps to which
   axis, and what the vote means on it — so it is DELIBERATE STAFF WORK, one
   vote at a time, never batch inference. The staff coding is usable for
   scoring by the SCORING.md S2 rule (staff = human by definition); the vote's
   official record URL becomes the position's citation. Counsel cleared public
   score display for real candidates 2026-07-28 (item 11/B2, 1st Amendment
   basis); the 50% coverage gate (SCORING.md S1.3) still governs per-candidate
   display — this tool only builds the substrate. */

export async function politiciansWithVotes() {
  const { rows } = await db().query(
    `SELECT p.id, p.full_name, count(v.*)::int AS votes,
            (SELECT count(DISTINCT pc.axis_id)::int
               FROM politician_positions pp
               JOIN position_codings pc ON pc.position_id = pp.id AND pc.usable_for_scoring
              WHERE pp.politician_id = p.id) AS axes_covered
       FROM politicians p JOIN voting_records v ON v.politician_id = p.id
      GROUP BY p.id, p.full_name ORDER BY p.full_name`,
  );
  return rows as { id: string; full_name: string; votes: number; axes_covered: number }[];
}

export async function votesForCoding(politicianId: string, limit = 40) {
  const { rows } = await db().query(
    `SELECT v.bill_external_id, v.bill_title, v.vote, v.voted_at::text AS date, v.source_url,
            EXISTS (
              SELECT 1 FROM politician_positions pp
               JOIN citations c ON c.id = pp.citation_id
              WHERE pp.politician_id = v.politician_id AND c.url = v.source_url
            ) AS already_coded
       FROM voting_records v
      WHERE v.politician_id = $1
      ORDER BY v.voted_at DESC, v.bill_external_id DESC
      LIMIT $2`,
    [politicianId, limit],
  );
  return rows as {
    bill_external_id: string; bill_title: string; vote: string; date: string;
    source_url: string; already_coded: boolean;
  }[];
}

// jurisdiction-scoped (migration 105) -- required, not optional. Real gap
// this closes before it ever bites: once a federal axis exists alongside
// Montgomery's county-specific ones (MCPS funding, Ride On buses), an
// unscoped dropdown would let staff code a U.S. Representative's vote onto
// "should the county fully fund MCPS" -- structurally impossible (a
// Representative never votes on that), and a coding mistake CODING-
// STANDARDS.md's "code only what the record actually shows" rule exists to
// prevent. Scoped to THIS politician's own office (politicianJurisdiction()'s
// ancestor walk, same recursive CTE as topicsWithAxes()) rather than any
// notion of a viewer -- there is no viewer here, only the record being coded.
export async function axesForCoding(politicianId: string) {
  const { rows } = await db().query(
    // published-only (migration 092) -- staff shouldn't be coding a
    // candidate's position against an axis that hasn't cleared review yet.
    //
    // Real gap found live 2026-09-28, once the 8 federal axes actually
    // published: NULL/nationwide previously matched UNCONDITIONALLY here,
    // same bug as topicsWithAxes() had before migration 105 -- but the
    // fix isn't symmetric with that one. A resident should see a nationwide
    // axis regardless of where they live (it's their own priority to set);
    // a VOTE can only be evidence for a nationwide axis if it was cast at
    // the level of government that axis's own wording asks about -- every
    // one of the 8 federal axes literally reads "should the federal
    // government/Congress...", so only a federal vote can honestly answer
    // it. Left unfixed, staff coding a Montgomery councilmember's LOCAL
    // housing vote via /admin/positions would see "should the federal
    // government expand health coverage" sitting in the same dropdown --
    // a real miscoding risk, not just clutter, the moment the federal
    // axes went live. Fixed: NULL axes now require the politician's own
    // OFFICE LEVEL to be 'federal' -- not a jurisdiction_id string match.
    // Real bug caught testing this exact fix: a U.S. Representative's own
    // office.jurisdiction_id is the STATE-level ocd_id (congress.mjs
    // anchors House/Senate offices to their state, e.g.
    // 'ocd-division/country:us/state:md'), NOT the literal country root --
    // only VOTES (voting_records.jurisdiction_id) carry that root, per
    // congress-votes.mjs/senate-votes.mjs. Comparing the office's
    // jurisdiction_id to the country ocd_id would silently show federal
    // members zero nationwide axes. offices.level = 'federal' is the
    // correct, direct signal (set by congress.mjs for every Senate/House
    // seat) regardless of how the office happens to be jurisdiction-anchored.
    `WITH RECURSIVE own_office AS (
       SELECT o.jurisdiction_id, o.level FROM politicians p
         JOIN offices o ON o.id = p.current_office_id
        WHERE p.id = $1
     ),
     stack AS (
       SELECT j.ocd_id, j.parent_ocd_id FROM jurisdictions j, own_office oo
        WHERE j.ocd_id = oo.jurisdiction_id
       UNION ALL
       SELECT j.ocd_id, j.parent_ocd_id FROM jurisdictions j JOIN stack s ON j.ocd_id = s.parent_ocd_id
     )
     SELECT a.id, t.name AS topic, a.question, a.negative_pole, a.positive_pole
       FROM topic_axes a JOIN topics t ON t.id = a.topic_id, own_office oo
      WHERE a.status = 'published'
        AND (
          (a.jurisdiction_id IS NULL AND oo.level = 'federal')
          OR a.jurisdiction_id IN (SELECT ocd_id FROM stack)
        )
      ORDER BY t.name`,
    [politicianId],
  );
  return rows as { id: string; topic: string; question: string; negative_pole: string; positive_pole: string }[];
}

export async function createPositionFromVote(opts: {
  politicianId: string;
  billExternalId: string;
  axisId: string;
  value: number;
  statement: string;
}): Promise<"ok" | "invalid" | "no_vote" | "duplicate"> {
  if (!opts.statement.trim() || !Number.isInteger(opts.value) || opts.value < -2 || opts.value > 2) return "invalid";
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const vote = await client.query(
      `SELECT bill_title, vote, voted_at, source_url FROM voting_records
        WHERE politician_id = $1 AND bill_external_id = $2`,
      [opts.politicianId, opts.billExternalId],
    );
    if (vote.rowCount === 0) {
      await client.query("ROLLBACK");
      return "no_vote";
    }
    const v = vote.rows[0];
    // One position per (politician, bill, axis): same official record must not
    // be coded twice onto the same axis.
    const dup = await client.query(
      `SELECT 1 FROM politician_positions pp
        JOIN citations c ON c.id = pp.citation_id
        JOIN position_codings pc ON pc.position_id = pp.id
       WHERE pp.politician_id = $1 AND c.url = $2 AND pc.axis_id = $3`,
      [opts.politicianId, v.source_url, opts.axisId],
    );
    if (dup.rowCount) {
      await client.query("ROLLBACK");
      return "duplicate";
    }
    const jur = await client.query(
      `SELECT j.name FROM politicians p
         JOIN offices o ON o.id = p.current_office_id
         JOIN jurisdictions j ON j.ocd_id = o.jurisdiction_id
        WHERE p.id = $1`,
      [opts.politicianId],
    );
    const publisher = jur.rows[0]?.name ? `${jur.rows[0].name} legislative record` : "Legislative record";
    const cit = await client.query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/' || $1, $2, $3, $4)
       RETURNING id`,
      [v.source_url, `${opts.billExternalId} · roll call · ${String(v.vote).toUpperCase()}`, publisher, v.voted_at],
    );
    const topic = await client.query(`SELECT topic_id FROM topic_axes WHERE id = $1`, [opts.axisId]);
    if (topic.rowCount === 0) {
      await client.query("ROLLBACK");
      return "invalid";
    }
    const pos = await client.query(
      `INSERT INTO politician_positions (politician_id, topic_id, statement, source_type, citation_id, recorded_at)
       VALUES ($1, $2, $3, 'voting_record_inferred', $4, $5) RETURNING id`,
      [opts.politicianId, topic.rows[0].topic_id, opts.statement.trim(), cit.rows[0].id, v.voted_at],
    );
    await client.query(
      `INSERT INTO position_codings (position_id, axis_id, value, coding_method, coder_note)
       VALUES ($1, $2, $3, 'staff', 'Coded from recorded vote via admin vote-to-position tool')`,
      [pos.rows[0].id, opts.axisId, opts.value],
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

export async function recentCodedPositions(limit = 10) {
  const { rows } = await db().query(
    `SELECT pol.full_name, t.name AS topic, pc.value, pp.statement, pp.recorded_at::date::text AS date
       FROM politician_positions pp
       JOIN politicians pol ON pol.id = pp.politician_id
       JOIN position_codings pc ON pc.position_id = pp.id
       JOIN topics t ON t.id = pp.topic_id
      WHERE pp.source_type = 'voting_record_inferred' AND pc.coder_note LIKE '%vote-to-position%'
      ORDER BY pp.id DESC LIMIT $1`,
    [limit],
  );
  return rows as { full_name: string; topic: string; value: number; statement: string; date: string }[];
}
