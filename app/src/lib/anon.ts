import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
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
