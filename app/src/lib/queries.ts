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

/* ── data-mode detection ──
   True while the database still carries the fictional dev seed; drives which
   disclosure the scoring surfaces show. After the D1 cutover this returns
   false in production and the real-data disclosure renders instead. */
export async function isSampleData(): Promise<boolean> {
  const { rows } = await db().query(
    `SELECT EXISTS (SELECT 1 FROM politicians WHERE bio LIKE 'Fictional sample%') AS sample`,
  );
  return rows[0]?.sample ?? false;
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

/* ── Phase 2: promises & integrity flags (voter-facing) ── */
export async function promisesFor(politicianId: string) {
  const { rows } = await db().query(
    `SELECT p.id, p.statement, p.current_status, t.name AS topic,
            COALESCE(json_agg(json_build_object(
              'status', e.status, 'note', e.note, 'date', e.recorded_at::date::text,
              'publisher', c.publisher, 'archived', c.archive_url IS NOT NULL
            ) ORDER BY e.recorded_at) FILTER (WHERE e.id IS NOT NULL), '[]') AS events
       FROM promises p
       JOIN topics t ON t.id = p.topic_id
       LEFT JOIN promise_status_events e ON e.promise_id = p.id
       LEFT JOIN citations c ON c.id = e.citation_id
      WHERE p.politician_id = $1
      GROUP BY p.id, t.name
      ORDER BY p.made_at, p.statement`,
    [politicianId],
  );
  return rows as {
    id: string;
    statement: string;
    current_status: string;
    topic: string;
    events: { status: string; note: string | null; date: string; publisher: string | null; archived: boolean }[];
  }[];
}

/** Only published flags ever reach a voter (the CHECK guarantees none are open). */
export async function publishedFlagsFor(politicianId: string) {
  const { rows } = await db().query(
    `SELECT f.id, f.description, f.status,
            COALESCE((SELECT json_agg(json_build_object('publisher', c.publisher, 'title', c.title, 'date', c.published_at::text))
               FROM integrity_flag_citations fc JOIN citations c ON c.id = fc.citation_id
              WHERE fc.integrity_flag_id = f.id), '[]') AS citations,
            COALESCE((SELECT json_agg(json_build_object('status', e.status, 'note', e.note, 'date', e.recorded_at::date::text) ORDER BY e.recorded_at)
               FROM integrity_flag_status_events e WHERE e.integrity_flag_id = f.id), '[]') AS events
       FROM integrity_flags f
      WHERE f.politician_id = $1 AND f.published`,
    [politicianId],
  );
  return rows as {
    id: string;
    description: string;
    status: string;
    citations: { publisher: string; title: string; date: string }[];
    events: { status: string; note: string | null; date: string }[];
  }[];
}

/* ── Phase 2: admin console ── */
export async function adminFlags() {
  const { rows } = await db().query(
    `SELECT f.id, f.description, f.status, f.published, p.full_name
       FROM integrity_flags f JOIN politicians p ON p.id = f.politician_id
      ORDER BY (f.status = 'open') DESC, f.created_at DESC`,
  );
  return rows as { id: string; description: string; status: string; published: boolean; full_name: string }[];
}

export async function adminFlagDetail(id: string) {
  const flag = await db().query(
    `SELECT f.id, f.description, f.status, f.published, p.full_name
       FROM integrity_flags f JOIN politicians p ON p.id = f.politician_id WHERE f.id = $1`,
    [id],
  );
  if (flag.rowCount === 0) return null;
  const events = await db().query(
    `SELECT e.status, e.note, e.recorded_at::date::text AS date, c.publisher, c.title
       FROM integrity_flag_status_events e LEFT JOIN citations c ON c.id = e.citation_id
      WHERE e.integrity_flag_id = $1 ORDER BY e.recorded_at`,
    [id],
  );
  return { ...flag.rows[0], events: events.rows };
}

/** Attach evidence: create a citation, link it, record an append-only event. */
export async function adminAttachEvidence(flagId: string, url: string, title: string, publisher: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const cit = await client.query(
      `INSERT INTO citations (url, archive_url, title, publisher, published_at)
       VALUES ($1, 'https://web.archive.org/web/0/' || $1, $2, $3, CURRENT_DATE) RETURNING id`,
      [url, title, publisher],
    );
    await client.query(
      `INSERT INTO integrity_flag_citations (integrity_flag_id, citation_id) VALUES ($1, $2)`,
      [flagId, cit.rows[0].id],
    );
    await client.query(
      `INSERT INTO integrity_flag_status_events (integrity_flag_id, status, citation_id, note)
       SELECT $1, status, $2, 'Evidence attached: ' || $3 FROM integrity_flags WHERE id = $1`,
      [flagId, cit.rows[0].id, title],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function adminFlagEvent(flagId: string, note: string) {
  await db().query(
    `INSERT INTO integrity_flag_status_events (integrity_flag_id, status, note)
     SELECT $1, status, $2 FROM integrity_flags WHERE id = $1`,
    [flagId, note],
  );
}

/** Resolve: status + published move together, satisfying CHECK (NOT published OR status <> 'open'). */
export async function adminResolveFlag(flagId: string, outcome: "upheld" | "dismissed", note: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE integrity_flags SET status = $2, published = $3, resolved_at = now() WHERE id = $1`,
      [flagId, outcome, outcome === "upheld"],
    );
    await client.query(
      `INSERT INTO integrity_flag_status_events (integrity_flag_id, status, note) VALUES ($1, $2, $3)`,
      [flagId, outcome, note],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function adminCodingQueue() {
  const { rows } = await db().query(
    `SELECT pc.id, pc.value, pc.coder_note, po.full_name, pp.statement, pp.source_type,
            a.key AS axis_key, a.question, a.negative_pole, a.positive_pole,
            c.publisher, c.title, c.published_at::text AS date
       FROM position_codings pc
       JOIN politician_positions pp ON pp.id = pc.position_id
       JOIN politicians po ON po.id = pp.politician_id
       JOIN topic_axes a ON a.id = pc.axis_id
       LEFT JOIN citations c ON c.id = pp.citation_id
      WHERE NOT pc.usable_for_scoring
      ORDER BY pc.coded_at`,
  );
  return rows as {
    id: string; value: number; coder_note: string | null; full_name: string; statement: string;
    source_type: string; axis_key: string; question: string; negative_pole: string;
    positive_pole: string; publisher: string | null; title: string | null; date: string | null;
  }[];
}

export async function adminCodingAction(id: string, action: "confirm" | "reject" | "up" | "down") {
  if (action === "confirm") {
    await db().query(`UPDATE position_codings SET confirmed_by_human = TRUE WHERE id = $1`, [id]);
  } else if (action === "reject") {
    await db().query(`DELETE FROM position_codings WHERE id = $1 AND NOT usable_for_scoring`, [id]);
  } else {
    await db().query(
      `UPDATE position_codings SET value = GREATEST(-2, LEAST(2, value + $2)) WHERE id = $1 AND NOT usable_for_scoring`,
      [id, action === "up" ? 1 : -1],
    );
  }
}
