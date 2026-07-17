import { db } from "./db";
import type { EvidenceCoding, Priority } from "./scoring/engine";

const COUNTY = "ocd-division/country:us/state:md/county:montgomery";

/* ── your ballot ── */
export async function ballot() {
  const { rows } = await db().query(
    `SELECT o.id, o.title, o.level, o.seat_count,
            r.id AS race_id, r.seats_elected
       FROM offices o
       LEFT JOIN races r ON r.office_id = o.id
      WHERE o.jurisdiction_id = $1
      ORDER BY o.level, o.title`,
    [COUNTY],
  );
  return rows as {
    id: string;
    title: string;
    level: string;
    seat_count: number;
    race_id: string | null;
    seats_elected: number | null;
  }[];
}

/* ── topics + axes ── */
export async function topicsWithAxes() {
  const { rows } = await db().query(
    `SELECT t.id AS topic_id, t.name, a.id AS axis_id, a.question, a.negative_pole, a.positive_pole
       FROM topics t JOIN topic_axes a ON a.topic_id = t.id
      ORDER BY t.name`,
  );
  return rows as {
    topic_id: string;
    name: string;
    axis_id: string;
    question: string;
    negative_pole: string;
    positive_pole: string;
  }[];
}

/* ── anonymous voter (cookie-scoped; verification_tier stays 'unverified') ── */
export async function ensureUser(anonId: string): Promise<string> {
  const { rows } = await db().query(
    `INSERT INTO users (auth_id, residence_jurisdiction_id)
     VALUES ($1, $2)
     ON CONFLICT (auth_id) DO UPDATE SET auth_id = EXCLUDED.auth_id
     RETURNING id`,
    [`anon:${anonId}`, COUNTY],
  );
  return rows[0].id as string;
}

export interface PriorityInput {
  axisId: string;
  direction: 1 | -1;
  weight: number;
  statement: string;
}

export async function savePriorities(userId: string, items: PriorityInput[]) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM voter_priorities WHERE user_id = $1`, [userId]);
    for (const it of items) {
      await client.query(
        `INSERT INTO voter_priorities (user_id, topic_id, statement, importance_weight, stance)
         SELECT $1, a.topic_id, $2, $3, jsonb_build_object('axis_id', a.id, 'direction', $4::int)
           FROM topic_axes a WHERE a.id = $5`,
        [userId, it.statement, it.weight, it.direction, it.axisId],
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

export async function loadPriorities(userId: string): Promise<(Priority & { statement: string })[]> {
  const { rows } = await db().query(
    `SELECT stance->>'axis_id' AS axis_id, (stance->>'direction')::int AS direction,
            importance_weight, statement
       FROM voter_priorities WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => ({
    axisId: r.axis_id as string,
    direction: (r.direction as number) === -1 ? -1 : 1,
    weight: r.importance_weight as Priority["weight"],
    statement: r.statement as string,
  }));
}

/* ── races + candidates ── */
export async function races() {
  const { rows } = await db().query(
    `SELECT r.id, o.title, r.seats_elected, o.seat_type
       FROM races r JOIN offices o ON o.id = r.office_id
      ORDER BY o.title`,
  );
  return rows as { id: string; title: string; seats_elected: number; seat_type: string }[];
}

export interface CandidateRow {
  politician_id: string;
  candidacy_id: string;
  full_name: string;
  party: string | null;
  incumbent: boolean;
}

export async function candidatesInRace(raceId: string): Promise<CandidateRow[]> {
  const { rows } = await db().query(
    `SELECT p.id AS politician_id, c.id AS candidacy_id, p.full_name, c.party,
            EXISTS (SELECT 1 FROM race_incumbents ri WHERE ri.race_id = c.race_id AND ri.politician_id = p.id) AS incumbent
       FROM candidacies c JOIN politicians p ON p.id = c.politician_id
      WHERE c.race_id = $1
      ORDER BY p.full_name`,
    [raceId],
  );
  return rows as CandidateRow[];
}

/**
 * Usable evidence per axis for a set of politicians — the SCORING.md S2 gate lives
 * in the WHERE clause: only usable_for_scoring codings ever reach the engine.
 */
export async function evidenceForPoliticians(politicianIds: string[]) {
  const { rows } = await db().query(
    `SELECT pp.politician_id, pc.axis_id, pc.value, pp.source_type,
            COALESCE(ci.published_at::text, pp.recorded_at::date::text) AS date,
            pp.statement, ci.publisher, ci.title, ci.archive_url
       FROM position_codings pc
       JOIN politician_positions pp ON pp.id = pc.position_id
       LEFT JOIN citations ci ON ci.id = pp.citation_id
      WHERE pc.usable_for_scoring AND pp.politician_id = ANY($1)`,
    [politicianIds],
  );
  const byPol: Record<string, Record<string, (EvidenceCoding & {
    statement: string; publisher: string | null; title: string | null; archived: boolean;
  })[]>> = {};
  for (const r of rows) {
    const pol = (byPol[r.politician_id] ??= {});
    (pol[r.axis_id] ??= []).push({
      value: r.value,
      sourceType: r.source_type,
      date: r.date,
      statement: r.statement,
      publisher: r.publisher,
      title: r.title,
      archived: r.archive_url !== null,
    });
  }
  return byPol;
}

/* ── candidate profile extras (Phase 1 transparency, §8.1) ── */
export async function politicianProfile(politicianId: string) {
  const pol = await db().query(
    `SELECT p.id, p.full_name, p.party, p.bio,
            (SELECT o.title FROM office_terms ot JOIN offices o ON o.id = ot.office_id
              WHERE ot.politician_id = p.id AND ot.term_end IS NULL LIMIT 1) AS current_office
       FROM politicians p WHERE p.id = $1`,
    [politicianId],
  );
  if (pol.rowCount === 0) return null;
  const expenditures = await db().query(
    `SELECT iec.name AS committee, ie.direction, ie.amount_usd, ie.expenditure_date::text, ie.purpose,
            ci.publisher, ci.url
       FROM independent_expenditures ie
       JOIN independent_expenditure_committees iec ON iec.id = ie.committee_id
       JOIN citations ci ON ci.id = ie.citation_id
      WHERE ie.benefits_politician_id = $1
      ORDER BY ie.expenditure_date DESC`,
    [politicianId],
  );
  const endorsements = await db().query(
    `SELECT eo.name AS organization, eo.org_type, e.endorsed_at::text, ci.publisher
       FROM endorsements e
       JOIN endorsing_organizations eo ON eo.id = e.organization_id
       JOIN candidacies c ON c.id = e.candidacy_id
       JOIN citations ci ON ci.id = e.citation_id
      WHERE c.politician_id = $1 AND NOT e.rescinded
      ORDER BY e.endorsed_at`,
    [politicianId],
  );
  return {
    ...pol.rows[0],
    expenditures: expenditures.rows,
    endorsements: endorsements.rows,
  };
}
