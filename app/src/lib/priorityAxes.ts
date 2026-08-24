import { db } from "./db";

/* Admin-editable priority topics/axes (docs/BACKLOG.md, 2026-08-23 entry).
   topic_axes is the single most consequential data in the platform -- the
   actual questions every candidate and every voter gets measured against.
   Draft -> in_review -> published -> retired (migration 092); wording is
   locked at the database layer the moment an axis is published (see that
   migration's trigger) -- this module never even attempts to violate it,
   but doesn't rely on that alone either (defense in depth). */

export interface AdminAxis {
  id: string;
  topicId: string;
  topicName: string;
  key: string;
  question: string;
  negativePole: string;
  positivePole: string;
  status: "draft" | "in_review" | "published" | "retired";
  createdByAdmin: string | null;
  reviewedByAdmin: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
  supersededByAxisId: string | null;
}

export async function topicsList(): Promise<{ id: string; name: string }[]> {
  const { rows } = await db().query(`SELECT id, name FROM topics WHERE parent_id IS NULL ORDER BY name`);
  return rows;
}

export async function listAxesForAdmin(): Promise<AdminAxis[]> {
  const { rows } = await db().query(
    `SELECT a.id, a.topic_id, t.name AS topic_name, a.key, a.question, a.negative_pole, a.positive_pole,
            a.status, a.created_by_admin, a.reviewed_by_admin,
            a.published_at::text AS published_at, a.retired_at::text AS retired_at, a.superseded_by_axis_id
       FROM topic_axes a JOIN topics t ON t.id = a.topic_id
      ORDER BY CASE a.status WHEN 'in_review' THEN 0 WHEN 'draft' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
               t.name, a.key`,
  );
  return rows.map((r) => ({
    id: r.id,
    topicId: r.topic_id,
    topicName: r.topic_name,
    key: r.key,
    question: r.question,
    negativePole: r.negative_pole,
    positivePole: r.positive_pole,
    status: r.status,
    createdByAdmin: r.created_by_admin,
    reviewedByAdmin: r.reviewed_by_admin,
    publishedAt: r.published_at,
    retiredAt: r.retired_at,
    supersededByAxisId: r.superseded_by_axis_id,
  }));
}

/** Structured fields, not a blank textarea (owner's explicit guardrail) --
    the two poles are forced into their own parallel, symmetric inputs by
    this signature, not free-typed into one blob a leading framing could
    slip through unnoticed in. Topic is either an existing one or a new
    top-level name; topics themselves aren't versioned (they're just a
    grouping label, not scored content) so creating one is immediate, not
    part of the draft/review pipeline. */
export async function createDraftAxis(opts: {
  topicId?: string;
  newTopicName?: string;
  key: string;
  question: string;
  negativePole: string;
  positivePole: string;
  createdByAdmin: string;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  if (!opts.topicId && !opts.newTopicName) return { ok: false, reason: "topic" };
  if (!opts.key.trim() || !opts.question.trim() || !opts.negativePole.trim() || !opts.positivePole.trim()) {
    return { ok: false, reason: "fields" };
  }
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    let topicId = opts.topicId;
    if (!topicId && opts.newTopicName) {
      const existing = await client.query(`SELECT id FROM topics WHERE parent_id IS NULL AND name = $1`, [
        opts.newTopicName,
      ]);
      topicId =
        existing.rows[0]?.id ??
        (await client.query(`INSERT INTO topics (name) VALUES ($1) RETURNING id`, [opts.newTopicName])).rows[0].id;
    }
    const { rows } = await client.query(
      `INSERT INTO topic_axes (topic_id, key, question, negative_pole, positive_pole, status, created_by_admin)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6) RETURNING id`,
      [topicId, opts.key, opts.question, opts.negativePole, opts.positivePole, opts.createdByAdmin],
    );
    await client.query("COMMIT");
    return { ok: true, id: rows[0].id as string };
  } catch (e) {
    await client.query("ROLLBACK");
    // UNIQUE (topic_id, key) is the only realistic constraint hit here.
    return { ok: false, reason: e instanceof Error && /unique/i.test(e.message) ? "duplicate_key" : "error" };
  } finally {
    client.release();
  }
}

/** Editing is only ever allowed while still a draft -- an in_review axis
    must be sent back to draft first (explicit, not a silent side effect of
    saving an edit), so "I tweaked it after submitting" can never quietly
    skip a fresh review of the final wording. */
export async function updateDraftAxis(
  axisId: string,
  opts: { question: string; negativePole: string; positivePole: string },
): Promise<{ ok: boolean }> {
  const { rowCount } = await db().query(
    `UPDATE topic_axes SET question = $2, negative_pole = $3, positive_pole = $4
      WHERE id = $1 AND status = 'draft'`,
    [axisId, opts.question, opts.negativePole, opts.positivePole],
  );
  return { ok: (rowCount ?? 0) > 0 };
}

export async function deleteDraftAxis(axisId: string): Promise<{ ok: boolean }> {
  const { rowCount } = await db().query(`DELETE FROM topic_axes WHERE id = $1 AND status = 'draft'`, [axisId]);
  return { ok: (rowCount ?? 0) > 0 };
}

export async function submitForReview(axisId: string): Promise<{ ok: boolean }> {
  const { rowCount } = await db().query(
    `UPDATE topic_axes SET status = 'in_review' WHERE id = $1 AND status = 'draft'`,
    [axisId],
  );
  return { ok: (rowCount ?? 0) > 0 };
}

export async function sendBackToDraft(axisId: string): Promise<{ ok: boolean }> {
  const { rowCount } = await db().query(
    `UPDATE topic_axes SET status = 'draft', reviewed_by_admin = NULL WHERE id = $1 AND status = 'in_review'`,
    [axisId],
  );
  return { ok: (rowCount ?? 0) > 0 };
}

/** Second-person review, application layer (the database's own
    topic_axes_reviewer_not_author CHECK is the layer that actually can't be
    bypassed -- this is the friendlier error before that constraint would
    reject it). */
export async function approveAndPublish(
  axisId: string,
  reviewerUsername: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const axis = await db().query(`SELECT created_by_admin, status FROM topic_axes WHERE id = $1`, [axisId]);
  if (axis.rowCount === 0) return { ok: false, reason: "not_found" };
  if (axis.rows[0].status !== "in_review") return { ok: false, reason: "not_in_review" };
  if (axis.rows[0].created_by_admin === reviewerUsername) return { ok: false, reason: "self_review" };
  const { rowCount } = await db().query(
    `UPDATE topic_axes SET status = 'published', reviewed_by_admin = $2, published_at = now()
      WHERE id = $1 AND status = 'in_review'`,
    [axisId, reviewerUsername],
  );
  return (rowCount ?? 0) > 0 ? { ok: true } : { ok: false, reason: "race" };
}

/** A rewording is a NEW axis (see createDraftAxis + the lock-published
    trigger) -- this just marks the old one retired, optionally pointing at
    whatever axis actually replaced it. Retiring never deletes: existing
    position_codings and voter_priorities keep pointing at a real,
    still-readable row, just one topicsWithAxes()/axesForCoding() no longer
    offer going forward. */
export async function retireAxis(axisId: string, supersededByAxisId?: string): Promise<{ ok: boolean }> {
  const { rowCount } = await db().query(
    `UPDATE topic_axes SET status = 'retired', retired_at = now(), superseded_by_axis_id = $2
      WHERE id = $1 AND status = 'published'`,
    [axisId, supersededByAxisId ?? null],
  );
  return { ok: (rowCount ?? 0) > 0 };
}
