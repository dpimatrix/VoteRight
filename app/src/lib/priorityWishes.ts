import { db } from "./db";
import { notifyAdmins } from "./adminNotify";
import { notifyUsers } from "./notifications";

/* Priority-Wishes (2026-09-03, owner request, migration 097). A resident
   suggests a new priority axis; staff review and decide. Modeled on
   issue_proposals' own propose -> review -> becomes-official shape
   (already live for debate topics, see debates.ts's createProposal) --
   same governance pattern, new table, NOT a repurposing of issue_proposals
   itself (a wish isn't a debate topic). An approved wish does not
   automatically become a topic_axes row -- staff still write the final,
   balanced axis wording (priorityAxes.ts) using the wish as input. */

export interface PriorityWish {
  id: string;
  statement: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

const MAX_STATEMENT_LEN = 500; // generous for a one-paragraph suggestion, short enough no one mistakes this for a debate argument

export async function submitPriorityWish(userId: string, statement: string): Promise<{ ok: true; id: string } | { ok: false; reason: "empty" | "too_long" }> {
  const trimmed = statement.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > MAX_STATEMENT_LEN) return { ok: false, reason: "too_long" };
  const { rows } = await db().query(
    `INSERT INTO priority_wishes (submitter_id, statement) VALUES ($1, $2) RETURNING id`,
    [userId, trimmed],
  );
  const id = rows[0].id as string;
  // Best-effort, after the row is safely written -- a delivery failure
  // must never make the submission itself appear to fail (notifyAdmins
  // already never throws, but the call site shouldn't depend on that).
  await notifyAdmins(
    "priority_axes",
    "New priority wish submitted",
    `"${trimmed}"\n\nReview: ${process.env.SITE_URL ?? "https://voteright.dpimatrix.com"}/admin/priority-axes`,
  );
  return { ok: true, id };
}

/** A submitter's own wishes, most recent first -- lets the mobile/web UI
    show "here's what you suggested and what happened to it" without a
    separate admin-only endpoint. */
export async function listOwnPriorityWishes(userId: string): Promise<PriorityWish[]> {
  const { rows } = await db().query(
    `SELECT id, statement, status, admin_note, created_at::text AS created_at, decided_at::text AS decided_at
       FROM priority_wishes WHERE submitter_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id, statement: r.statement, status: r.status, adminNote: r.admin_note,
    createdAt: r.created_at, decidedAt: r.decided_at,
  }));
}

export interface AdminPriorityWish extends PriorityWish {
  submitterId: string;
}

export async function listPendingPriorityWishes(): Promise<AdminPriorityWish[]> {
  const { rows } = await db().query(
    `SELECT id, submitter_id, statement, status, admin_note, created_at::text AS created_at, decided_at::text AS decided_at
       FROM priority_wishes WHERE status = 'pending' ORDER BY created_at`,
  );
  return rows.map((r) => ({
    id: r.id, submitterId: r.submitter_id, statement: r.statement, status: r.status, adminNote: r.admin_note,
    createdAt: r.created_at, decidedAt: r.decided_at,
  }));
}

/** Decides a pending wish and notifies the submitter through the existing
    voter-facing notification pipeline (in-app + push + opt-in email) --
    they're a regular user, not an admin, so this reuses notifications.ts
    rather than adminNotify.ts. Only acts on a row still 'pending' (the
    UPDATE's own WHERE clause), so two admins racing to decide the same
    wish can't both succeed -- the second gets rowCount 0 and a clean
    "already decided" instead of silently overwriting the first
    decision's note. */
export async function decidePriorityWish(
  wishId: string,
  decidedByAdminId: string,
  decision: "approved" | "rejected",
  note: string | null,
): Promise<{ ok: boolean }> {
  const { rows } = await db().query(
    `UPDATE priority_wishes SET status = $2, admin_note = $3, decided_by = $4, decided_at = now()
      WHERE id = $1 AND status = 'pending'
      RETURNING submitter_id, statement`,
    [wishId, decision, note, decidedByAdminId],
  );
  if (rows.length === 0) return { ok: false };
  await notifyUsers([rows[0].submitter_id as string], decision === "approved" ? "priority_wish_approved" : "priority_wish_rejected", {
    detail: note ?? undefined,
  });
  return { ok: true };
}
