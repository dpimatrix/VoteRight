import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { ensureUser } from "./queries";

const COOKIE = "vr_uid";
// Native clients have no cookie jar (see mobile/services/api.ts) — they carry the
// same anon identity in this header instead, minted via POST /api/mobile/session.
const SESSION_HEADER = "x-voteright-session";

async function headerSessionId(): Promise<string | null> {
  const h = await headers();
  return h.get(SESSION_HEADER);
}

/** Read the anonymous-voter cookie (web) or session header (native) without creating anything. */
export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const anon = store.get(COOKIE)?.value ?? (await headerSessionId());
  if (!anon) return null;
  return ensureUser(anon);
}

/** §9 gate: returns the user id only if address-verified (or better); null otherwise. */
export async function verifiedUserId(): Promise<string | null> {
  const { userTier } = await import("./debates");
  const userId = await currentOrNewUserId();
  const tier = await userTier(userId);
  return tier === "unverified" ? null : userId;
}

/** Identity recovery (2026-08-19, see signing.ts's ownerOfValidKey()):
    re-points THIS session's cookie at an existing user id, rather than
    only minting one when absent like currentOrNewUserId() does. Web only
    -- native clients manage their own session id client-side (see
    api/keys/recover/route.ts, which returns the recovered value in the
    response body for a native caller to store itself instead of relying
    on a Set-Cookie header).

    The cookie stores an opaque anon string, not the user_id directly --
    ensureUser() looks a user up by auth_id = 'anon:' + that string. Reusing
    the SAME original string (recovered by stripping the 'anon:' prefix
    back off, not minting a new one) means any OTHER device still carrying
    the original cookie keeps working too, the same "signed in on multiple
    devices at once" property a real login system would have -- recovery
    adds access, it doesn't revoke the old session. */
export async function adoptIdentity(targetUserId: string): Promise<string> {
  const { rows } = await db().query(`SELECT auth_id FROM users WHERE id = $1`, [targetUserId]);
  const authId = rows[0]?.auth_id as string | undefined;
  if (!authId?.startsWith("anon:")) throw new Error("target user has no recoverable anonymous identity");
  const anonId = authId.slice("anon:".length);
  const store = await cookies();
  store.set(COOKIE, anonId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return anonId;
}

/** Debate-participation gate (2026-08-19): stricter than verifiedUserId()
    above -- requires the payment-as-verification tier specifically
    (migration 085), not just an address. Scoped to debate actions only
    (second/argue/ctq/agree/debate creation) per the owner's original "to
    enter the debate" framing -- referenda and accountability-campaign
    routes deliberately keep using the plain verifiedUserId() gate above,
    unchanged. */
export async function paymentVerifiedUserId(): Promise<string | null> {
  const { userTier } = await import("./debates");
  const userId = await currentOrNewUserId();
  const tier = await userTier(userId);
  return tier === "payment_verified" ? userId : null;
}

/** Route-handler variant: mint the cookie if missing (cookies are writable there).
 *  A request carrying the native session header never gets a cookie minted —
 *  that client manages its own identity (see /api/mobile/session). */
export async function currentOrNewUserId(): Promise<string> {
  const store = await cookies();
  let anon = store.get(COOKIE)?.value ?? (await headerSessionId());
  if (!anon) {
    anon = randomUUID();
    store.set(COOKIE, anon, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return ensureUser(anon);
}
