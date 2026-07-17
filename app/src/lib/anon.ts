import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { ensureUser } from "./queries";

const COOKIE = "vr_uid";

/** Read the anonymous-voter cookie without creating anything. */
export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const anon = store.get(COOKIE)?.value;
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

/** Route-handler variant: mint the cookie if missing (cookies are writable there). */
export async function currentOrNewUserId(): Promise<string> {
  const store = await cookies();
  let anon = store.get(COOKIE)?.value;
  if (!anon) {
    anon = randomUUID();
    store.set(COOKIE, anon, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return ensureUser(anon);
}
