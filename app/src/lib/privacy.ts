import { db } from "./db";

/* MODPA rights machinery (Md. Code, Com. Law §14-4601 et seq.; notice lives at
   /privacy). In-app form → privacy_requests queue → admin console works the
   statutory clock. Deletion executes the ARCHITECTURE.md §10 pseudonymization. */

export const RESPONSE_DAYS = 45; // + one 45-day extension available (noted to admin)
export const APPEAL_DAYS = 60;

export function dueAt(receivedMs: number, type: string): Date {
  const days = type === "appeal" ? APPEAL_DAYS : RESPONSE_DAYS;
  return new Date(receivedMs + days * 24 * 3600 * 1000);
}

export type RequestType = "access" | "correction" | "deletion" | "portability" | "appeal";

export async function createRequest(opts: {
  userId: string;
  type: RequestType;
  details?: string;
  responseContact?: string;
  appealOf?: string;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  if (opts.type === "appeal" && !opts.appealOf) return { ok: false };
  const { rows } = await db().query(
    `INSERT INTO privacy_requests (user_id, request_type, details, response_contact, appeal_of, due_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      opts.userId,
      opts.type,
      opts.details || null,
      opts.responseContact || null,
      opts.type === "appeal" ? opts.appealOf : null,
      dueAt(Date.now(), opts.type),
    ],
  );
  return { ok: true, id: rows[0].id as string };
}

/** The requester's own requests (cookie identity) — lets them see status and
    appeal a denial without any email round-trip. */
export async function myRequests(userId: string) {
  const { rows } = await db().query(
    `SELECT id, request_type, status, received_at::date::text AS received, due_at::date::text AS due,
            resolved_at::date::text AS resolved, resolution_note, appeal_of
       FROM privacy_requests WHERE user_id = $1 ORDER BY received_at DESC`,
    [userId],
  );
  return rows as {
    id: string; request_type: string; status: string; received: string; due: string;
    resolved: string | null; resolution_note: string | null; appeal_of: string | null;
  }[];
}

/* ── admin ── */
export async function adminPrivacyQueue() {
  const { rows } = await db().query(
    `SELECT pr.id, pr.request_type, pr.details, pr.response_contact, pr.status, pr.appeal_of,
            pr.received_at::date::text AS received, pr.due_at::date::text AS due,
            (pr.due_at < now() AND pr.status IN ('received','in_progress')) AS overdue,
            pr.resolution_note, u.id AS subject_user_id, u.deleted_at IS NOT NULL AS already_deleted,
            COALESCE(u.display_name, 'Resident') AS display_name
       FROM privacy_requests pr JOIN users u ON u.id = pr.user_id
      ORDER BY (pr.status IN ('received','in_progress')) DESC, pr.due_at`,
  );
  return rows as {
    id: string; request_type: string; details: string | null; response_contact: string | null;
    status: string; appeal_of: string | null; received: string; due: string; overdue: boolean;
    resolution_note: string | null; subject_user_id: string; already_deleted: boolean; display_name: string;
  }[];
}

export async function adminResolveRequest(id: string, status: "in_progress" | "completed" | "denied", note?: string) {
  await db().query(
    `UPDATE privacy_requests
        SET status = $2,
            resolution_note = COALESCE($3, resolution_note),
            resolved_at = CASE WHEN $2 IN ('completed','denied') THEN now() ELSE resolved_at END
      WHERE id = $1`,
    [id, status, note || null],
  );
}

/** ARCHITECTURE.md §10 deletion: pseudonymize the person, remove private
    signals, sever ballot-token identity. Public civic acts (§10.2 — arguments,
    seconds, proposals, campaign supports) persist, now attributed to
    'Resident'. Never a physical purge of the public record. */
export async function executeDeletion(userId: string, requestId: string) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE users
          SET auth_id = 'deleted:' || id,
              display_name = NULL,
              email_hash = NULL,
              deleted_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    await client.query(`DELETE FROM voter_priorities WHERE user_id = $1`, [userId]);
    // Private signals (§10.2): remove the per-user rows; the denormalized
    // per-argument tallies persist without identity.
    await client.query(`DELETE FROM argument_agreement_votes WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM call_the_question_votes WHERE user_id = $1`, [userId]);
    await client.query(`UPDATE referendum_ballot_tokens SET user_id = NULL WHERE user_id = $1`, [userId]);
    await client.query(
      `UPDATE privacy_requests SET status = 'completed', resolved_at = now(),
              resolution_note = 'Deletion executed: account pseudonymized (§10), private signals removed, ballot-token identity severed. Public civic acts persist as ''Resident''.'
        WHERE id = $1`,
      [requestId],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
