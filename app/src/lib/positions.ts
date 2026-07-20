import { db } from "./db";

/* Vote → position admin tool (DATA-OPS D2→D4 bridge). Turning a recorded vote
   into a scored position is the interpretive step — which bill maps to which
   axis, and what the vote means on it — so it is DELIBERATE STAFF WORK, one
   vote at a time, never batch inference. The staff coding is usable for
   scoring by the SCORING.md S2 rule (staff = human by definition); the vote's
   official record URL becomes the position's citation. Public score display
   additionally waits on the counsel methodology review (item 11/B2) and the
   50% coverage gate — this tool only builds the substrate. */

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

export async function axesForCoding() {
  const { rows } = await db().query(
    `SELECT a.id, t.name AS topic, a.question, a.negative_pole, a.positive_pole
       FROM topic_axes a JOIN topics t ON t.id = a.topic_id ORDER BY t.name`,
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
    const cit = await client.query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/' || $1, $2, 'Montgomery County legislative record', $3)
       RETURNING id`,
      [v.source_url, `${opts.billExternalId} · roll call · ${String(v.vote).toUpperCase()}`, v.voted_at],
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
