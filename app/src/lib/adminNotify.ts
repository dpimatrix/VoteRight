import { Resend } from "resend";
import { db } from "./db";
import { type ScreenKey } from "./adminAuth";

/* Admin operational alerts (2026-09-03, migration 097) -- deliberately
   separate from notifications.ts's voter-facing pipeline: admins live in
   admin_accounts, not users, have no push tokens, and this is a plain
   operator alert (no opt-in double-verification flow needed -- setting
   an email in /admin/admin-accounts IS the opt-in). Same Resend vendor,
   same "best-effort, never throws" posture as the voter path, but its
   own small client instance -- keeping admin-facing code decoupled from
   the voter-facing module, same separation adminAuth.ts already keeps
   from anon.ts. */

let resendClient: Resend | null = null;
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null; // unconfigured -- local dev default, no email sent, no error thrown
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

/** Emails every enabled admin who (a) holds access to `screen` and (b) has
    set an alert email. Best-effort and parallel -- one admin's bad address
    must never block delivery to the rest, and a total email-send failure
    must never propagate out to whatever real action (certifying a
    referendum, an ingester finishing) triggered the alert. Silently sends
    to nobody if no admin on that screen has an email set -- this is a
    real, reachable state (see docs/DEPLOY.md-style "opt-in" posture), not
    an error. */
export async function notifyAdmins(screen: ScreenKey, subject: string, body: string): Promise<void> {
  const client = resend();
  if (!client) return;
  let recipients: string[];
  try {
    const { rows } = await db().query(
      `SELECT DISTINCT a.email
         FROM admin_accounts a JOIN admin_screen_access s ON s.admin_id = a.id
        WHERE s.screen_key = $1 AND a.disabled_at IS NULL AND a.email IS NOT NULL`,
      [screen],
    );
    recipients = rows.map((r) => r.email as string);
  } catch (e) {
    console.error(`notifyAdmins: recipient lookup failed for screen ${screen}: ${(e as Error).message}`);
    return;
  }
  if (recipients.length === 0) return;
  await Promise.all(
    recipients.map(async (to) => {
      try {
        // Same real gap notifications.ts's own sendEmail already documents:
        // the Resend SDK resolves normally with { error } on a rejected
        // send rather than throwing -- must inspect it explicitly or a
        // failure is completely invisible.
        const { error } = await client.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "VoteRight <notifications@voteright.dpimatrix.com>",
          to,
          subject,
          text: body,
        });
        if (error) console.error(`admin alert email failed for ${to}: ${error.name} -- ${error.message}`);
      } catch (e) {
        console.error(`admin alert email failed for ${to}: ${(e as Error).message}`);
      }
    }),
  );
}
