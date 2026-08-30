import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { db } from "./db";

/* Notifications (2026-08-24, migration 094) -- three channels layered on
   one event source, so a caller only ever calls createNotification()/
   notifyUsers() once per event and never has to think about delivery:

     1. In-app (always written) -- the row in `notifications` itself. Reads
        it own `type`/`proposal_id`/`thread_id` back out and renders the
        message CLIENT-SIDE from i18n.ts, in the reader's own current
        language preference -- never a pre-rendered string, matching every
        other piece of copy in this bilingual app.
     2. Mobile push (best-effort) -- Expo's push service, free, no vendor
        decision (the app already runs on Expo). One push per registered
        device (push_tokens), fire-and-forget.
     3. Email (best-effort, opt-in only) -- Resend, the owner's vendor
        choice (2026-08-24). Only sent once notification_email_verified_at
        is set -- see signNotificationEmailToken below for why.

   KNOWN LIMITATION, stated plainly rather than silently shipped: push and
   email are composed server-side with no request context to read a `lang`
   preference from (unlike every other server-rendered string in this app,
   which reads it from a request's own ?lang= param or the mobile client's
   local device state) -- neither channel has anywhere to source a per-user
   language preference from today. Both render English-only for now. The
   in-app notification list is NOT affected -- it's rendered client-side
   from the same components/dictionaries as the rest of each app, so it's
   fully bilingual like everything else. Fixing push/email would mean
   adding a real users.lang_preference column and UI to set it, deliberately
   out of scope here rather than guessed at. */

export type NotificationType = "thread_closed" | "ctq_eligible";

interface NotifyOpts {
  proposalId?: string;
  threadId?: string;
  detail?: string;
}

// English-only copy for push/email -- see the file header's KNOWN
// LIMITATION note. `title` unused by findable to future body content;
// proposalTitle is interpolated where available.
function pushCopy(type: NotificationType, proposalTitle: string | null): { title: string; body: string } {
  const title = proposalTitle ?? "A debate you're part of";
  if (type === "thread_closed") {
    return { title: "Debate closed", body: `"${title}" has closed and is moving toward a referendum.` };
  }
  return { title: "Debate can now be called to a close", body: `"${title}" has enough participants and has been open long enough for any active participant to vote to end debate early.` };
}

async function sendPush(userId: string, type: NotificationType, proposalTitle: string | null): Promise<void> {
  try {
    const { rows } = await db().query(`SELECT token FROM push_tokens WHERE user_id = $1`, [userId]);
    if (rows.length === 0) return;
    const { title, body } = pushCopy(type, proposalTitle);
    // Expo's push API accepts a batch in one call -- one message object per
    // token, same request. https://docs.expo.dev/push-notifications/sending-notifications/
    const messages = rows.map((r) => ({ to: r.token as string, title, body, sound: "default" }));
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    });
    // Real gap found live 2026-08-30: fetch() only throws on a network-level
    // failure -- an HTTP error response (bad payload, revoked credentials,
    // Expo-side rejection) completed the request just fine and fell through
    // silently, with nothing in the catch below to ever log it. Same fix as
    // sendEmail's below; a non-2xx here is a real failure worth a log line,
    // not evidence-free.
    if (!res.ok) console.error(`push send failed for ${userId}: HTTP ${res.status} ${await res.text()}`);
  } catch (e) {
    // Best-effort, same posture as anomalyDetection.ts's flagIfAnomalous --
    // a delivery failure must never roll back the underlying DB event.
    console.error(`push send failed for ${userId}: ${(e as Error).message}`);
  }
}

let resendClient: Resend | null = null;
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null; // unconfigured -- local dev default, no email sent, no error thrown
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function sendEmail(userId: string, type: NotificationType, proposalTitle: string | null): Promise<void> {
  const client = resend();
  if (!client) return;
  try {
    const { rows } = await db().query(
      `SELECT notification_email FROM users WHERE id = $1 AND notification_email_verified_at IS NOT NULL`,
      [userId],
    );
    const to = rows[0]?.notification_email as string | undefined;
    if (!to) return;
    const { title, body } = pushCopy(type, proposalTitle);
    // Real gap found live 2026-08-30: the Resend SDK does NOT throw on a
    // rejected send (a truncated/invalid API key, in the incident that
    // surfaced this) -- it resolves normally with { data: null, error }.
    // Its own internal logging is deliberately disabled in production (see
    // its logError()'s own NODE_ENV check), so the caller MUST inspect
    // `error` itself or a real rejection is completely invisible: no thrown
    // exception, nothing in this catch, no entry in Resend's own dashboard
    // since the request never got far enough to be queued. This is exactly
    // how a truncated production RESEND_API_KEY went unnoticed for over a
    // day despite the in-app notification row being written correctly.
    const { error } = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "VoteRight <notifications@voteright.dpimatrix.com>",
      to,
      subject: title,
      text: `${body}\n\nManage notification preferences: ${process.env.SITE_URL ?? "https://voteright.dpimatrix.com"}/notifications`,
    });
    if (error) console.error(`notification email send failed for ${userId}: ${error.name} -- ${error.message}`);
  } catch (e) {
    console.error(`notification email send failed for ${userId}: ${(e as Error).message}`);
  }
}

/** Writes one notification row and best-effort dispatches push + email.
    Never throws -- a notification failure must never take down the real
    action (thread closing, etc.) that triggered it. */
export async function createNotification(userId: string, type: NotificationType, opts: NotifyOpts = {}): Promise<void> {
  try {
    await db().query(
      `INSERT INTO notifications (user_id, type, proposal_id, thread_id, detail) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, opts.proposalId ?? null, opts.threadId ?? null, opts.detail ?? null],
    );
  } catch (e) {
    console.error(`notification write failed for ${userId}: ${(e as Error).message}`);
    return; // no row written -- nothing to notify by push/email either
  }
  // Found live 2026-08-30: this query wasn't guarded like the INSERT above
  // it, contradicting this function's own "Never throws" promise -- a
  // transient DB error here would propagate out of createNotification()/
  // notifyUsers() uncaught, turning a best-effort notification failure into
  // a hard error for whatever real action (a CTQ vote closing a thread,
  // etc.) triggered it. proposalTitle already has a real fallback
  // (copyFor's own `proposalTitle ?? "A debate you're part of"`), so
  // falling back to null here costs nothing but a slightly generic title.
  let proposalTitle: string | null = null;
  if (opts.proposalId) {
    try {
      const { rows } = await db().query(`SELECT title FROM issue_proposals WHERE id = $1`, [opts.proposalId]);
      proposalTitle = rows[0]?.title ?? null;
    } catch (e) {
      console.error(`proposal title lookup failed for notification to ${userId}: ${(e as Error).message}`);
    }
  }
  await Promise.all([sendPush(userId, type, proposalTitle), sendEmail(userId, type, proposalTitle)]);
}

/** Same as createNotification, for every id in userIds -- de-duplicated so
    a user who's both an active participant AND the one who reported a
    thread doesn't get the same event twice. */
export async function notifyUsers(userIds: string[], type: NotificationType, opts: NotifyOpts = {}): Promise<void> {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((id) => createNotification(id, type, opts)));
}

export interface NotificationRow {
  id: string;
  type: NotificationType;
  proposal_id: string | null;
  proposal_title: string | null;
  thread_id: string | null;
  detail: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  const { rows } = await db().query(
    `SELECT n.id, n.type, n.proposal_id, p.title AS proposal_title, n.thread_id, n.detail,
            n.read_at, n.created_at
       FROM notifications n
       LEFT JOIN issue_proposals p ON p.id = n.proposal_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows as NotificationRow[];
}

export async function unreadCount(userId: string): Promise<number> {
  const { rows } = await db().query(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
  return rows[0].n as number;
}

export async function markRead(id: string, userId: string): Promise<void> {
  await db().query(`UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`, [id, userId]);
}

export async function markAllRead(userId: string): Promise<void> {
  await db().query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
}

/* ── mobile push token registration ── */

/** Upserts on the token itself, not (user_id, token): the same physical
    device reinstalling/switching identity should MOVE its token to
    whichever user_id is current, per migration 094's own comment, not
    accumulate stale rows still pointed at an abandoned identity. */
export async function registerPushToken(userId: string, token: string): Promise<void> {
  await db().query(
    `INSERT INTO push_tokens (user_id, token) VALUES ($1, $2)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [userId, token],
  );
}

/* ── opt-in notification email, with a signed verify-by-link flow ──
   Same signed-payload shape adminAuth.ts's signAdminSession/
   verifyAdminSession already established (HMAC-SHA256 over a plain
   "field.field" payload) -- reused here rather than a second token TABLE,
   since a verification link is inherently short-lived and self-contained;
   nothing about it needs to be revocable or looked up by anything other
   than the token itself. */
const EMAIL_TOKEN_TTL_MS = 24 * 3600_000; // 24h -- generous for an email round-trip, short enough that a stale unclicked link doesn't linger forever

function emailTokenSecret(): string {
  // Falls back to ADMIN_SESSION_SECRET rather than inventing a third env
  // var for one more HMAC secret -- same "a secret is a secret" reasoning
  // signing.ts's contextHash already applies elsewhere in this codebase.
  // Real deploys already set ADMIN_SESSION_SECRET (adminAuth.ts fails
  // closed without it in production); local dev's "dev-admin" ADMIN_TOKEN
  // path never calls this at all -- see setNotificationEmail's own guard.
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.NOTIFICATION_EMAIL_SECRET;
  if (!secret) throw new Error("no secret configured for notification email verification (set ADMIN_SESSION_SECRET or NOTIFICATION_EMAIL_SECRET)");
  return secret;
}

function signNotificationEmailToken(userId: string, email: string, expiresAtMs: number): string {
  const payload = `${userId}.${email}.${expiresAtMs}`;
  const sig = createHmac("sha256", emailTokenSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Returns the (userId, email) the token was issued for, or null if it's
    missing, malformed, expired, or tampered with. */
export function verifyNotificationEmailToken(token: string): { userId: string; email: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  // Split from both ends rather than a flat 4-way split: userId is a UUID
  // and sig is a hex digest, neither of which can contain ".", but the
  // email in between almost always does (e.g. "test@example.com") -- a
  // naive split(".").length !== 4 check rejected every real address.
  const parts = decoded.split(".");
  if (parts.length < 4) return null;
  const userId = parts[0];
  const sig = parts[parts.length - 1];
  const expStr = parts[parts.length - 2];
  const email = parts.slice(1, parts.length - 2).join(".");
  if (!userId || !email || !/^\d+$/.test(expStr) || Number(expStr) < Date.now()) return null;
  let expected: string;
  try {
    expected = createHmac("sha256", emailTokenSecret()).update(`${userId}.${email}.${expStr}`).digest("hex");
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { userId, email };
}

/** Sets a pending (unverified) notification email and sends the
    confirmation link. Overwrites any previous pending/verified address --
    entering a new one always restarts verification, so a mistyped address
    can't get stuck half-configured with no way to fix it. */
export async function setNotificationEmail(userId: string, email: string): Promise<{ ok: true } | { ok: false; reason: "invalid" | "unconfigured" }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "invalid" };
  const client = resend();
  if (!client) return { ok: false, reason: "unconfigured" }; // local dev without RESEND_API_KEY -- fail visibly rather than silently "succeeding" at nothing
  // Sign the token BEFORE writing anything -- emailTokenSecret() throws if
  // neither ADMIN_SESSION_SECRET nor NOTIFICATION_EMAIL_SECRET is set, and
  // that must fail closed without having already cleared the user's
  // verified_at in the DB.
  let token: string;
  try {
    token = signNotificationEmailToken(userId, email, Date.now() + EMAIL_TOKEN_TTL_MS);
  } catch (e) {
    console.error(`notification email token signing failed for ${userId}: ${(e as Error).message}`);
    return { ok: false, reason: "unconfigured" };
  }
  await db().query(
    `UPDATE users SET notification_email = $2, notification_email_verified_at = NULL WHERE id = $1`,
    [userId, email],
  );
  const verifyUrl = `${process.env.SITE_URL ?? "https://voteright.dpimatrix.com"}/api/notifications/verify-email?token=${token}`;
  try {
    await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "VoteRight <notifications@voteright.dpimatrix.com>",
      to: email,
      subject: "Confirm your VoteRight notification email",
      text: `Confirm this address to receive debate notifications by email:\n\n${verifyUrl}\n\nIf you didn't request this, ignore it -- nothing is sent until this link is clicked.`,
    });
  } catch (e) {
    console.error(`verification email send failed for ${userId}: ${(e as Error).message}`);
  }
  return { ok: true };
}

/** Confirms a pending notification email from a clicked verify link. Also
    checks the token's embedded email still matches what's on file -- if the
    user entered ANOTHER new address after this link was sent, this older
    link must not resurrect the address it superseded. */
export async function confirmNotificationEmail(token: string): Promise<boolean> {
  const parsed = verifyNotificationEmailToken(token);
  if (!parsed) return false;
  const { rows } = await db().query(`SELECT notification_email FROM users WHERE id = $1`, [parsed.userId]);
  if (rows[0]?.notification_email !== parsed.email) return false;
  await db().query(`UPDATE users SET notification_email_verified_at = now() WHERE id = $1`, [parsed.userId]);
  return true;
}

export async function clearNotificationEmail(userId: string): Promise<void> {
  await db().query(`UPDATE users SET notification_email = NULL, notification_email_verified_at = NULL WHERE id = $1`, [userId]);
}

export async function notificationEmailStatus(userId: string): Promise<{ email: string | null; verified: boolean }> {
  const { rows } = await db().query(`SELECT notification_email, notification_email_verified_at FROM users WHERE id = $1`, [userId]);
  return { email: rows[0]?.notification_email ?? null, verified: !!rows[0]?.notification_email_verified_at };
}
