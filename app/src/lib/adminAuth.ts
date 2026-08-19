import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

/* Admin auth, per-account + per-screen (2026-08-19 rewrite, migration 086).
   TOTP (RFC 6238, any authenticator app) is still the credential, but each
   admin now enrolls their OWN secret instead of sharing one process-wide
   ADMIN_TOTP_SECRET -- the previous flat isAdmin() yes/no gate had no way
   to represent "this admin sees only the payments screen." Session
   cookies carry the admin's id (HMAC-signed, so it can't be edited
   client-side to claim a different admin) rather than baking permissions
   into the cookie itself -- permissions are looked up fresh from the DB on
   every request, so revoking an admin's access to a screen takes effect
   immediately, not just after their session expires.

   Dev fallback (NODE_ENV !== 'production' only, unchanged from before):
   the ADMIN_TOKEN value logs in as a synthetic all-screens admin with zero
   setup required, so local dev keeps its existing friction-free path. */

const SESSION_COOKIE = "vr_admin_session";
const SESSION_HOURS = 12;
const DEV_SENTINEL = "dev";

/** Canonical list of admin screens, one key per /admin/* page. Deliberately
    NOT a DB CHECK constraint (see migration 086's comment) -- adding a new
    admin screen is a code change, not a migration. */
export const SCREEN_KEYS = [
  "disputes",
  "coding",
  "moderation",
  "anomalies",
  "payments",
  "mandates",
  "accountability",
  "privacy",
  "positions",
  "transparency",
  "admin_accounts",
] as const;
export type ScreenKey = (typeof SCREEN_KEYS)[number];
export const SCREEN_LABEL: Record<ScreenKey, string> = {
  disputes: "Integrity disputes",
  coding: "Position coding",
  moderation: "Argument moderation",
  anomalies: "Anomaly review",
  payments: "Payment verification",
  mandates: "Referenda & mandates",
  accountability: "Accountability campaigns",
  privacy: "Privacy requests",
  positions: "Vote → position coding",
  transparency: "Outside money & endorsements",
  admin_accounts: "Admin accounts",
};

/* ── base32 (RFC 4648, padding optional) ── */
export function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 0x1f];
  return out;
}

/** A fresh random base32 TOTP secret for a newly created admin account. */
export function generateTotpSecret(): string {
  const bytes = Buffer.from(randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""), "hex").subarray(0, 20);
  return base32Encode(bytes);
}

export function totpEnrollmentUri(secret: string, username: string): string {
  return `otpauth://totp/VoteRight%20Admin:${encodeURIComponent(username)}?secret=${secret}&issuer=VoteRight%20Admin`;
}

/* ── TOTP (RFC 6238, HMAC-SHA1, 30 s step, 6 digits) ── */
export function totpCode(secretBase32: string, timeMs: number): string {
  const counter = Math.floor(timeMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secretBase32)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

/** Accepts the current step and one step either side (clock skew). */
export function totpVerify(secretBase32: string, code: string, timeMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  let ok = false;
  for (const skew of [0, -1, 1]) {
    const expected = Buffer.from(totpCode(secretBase32, timeMs + skew * 30_000));
    const actual = Buffer.from(code);
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) ok = true;
  }
  return ok;
}

/* ── signed session: value = adminId.expiresAtMs.hmac(adminId.expiresAtMs) ── */
export function signAdminSession(adminId: string, expiresAtMs: number, secret: string): string {
  const payload = `${adminId}.${expiresAtMs}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** Returns the adminId if the session is validly signed and unexpired, else null. */
export function verifyAdminSession(value: string, secret: string, nowMs = Date.now()): string | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expStr, sig] = parts;
  if (!adminId || !/^\d+$/.test(expStr) || Number(expStr) < nowMs) return null;
  const expected = createHmac("sha256", secret).update(`${adminId}.${expStr}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return adminId;
}

/* ── harness ── */
function devMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function authConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET);
}

export interface AdminSession {
  id: string;
  username: string;
  screens: Set<ScreenKey>;
}

/** Verifies (username, TOTP code) against admin_accounts and mints a
    session cookie value, or null if refused. Production without
    ADMIN_SESSION_SECRET fails closed -- there's no secret to sign with. */
export async function loginWithCredentials(username: string, code: string): Promise<string | null> {
  if (devMode() && username === "" && code === (process.env.ADMIN_TOKEN ?? "dev-admin")) {
    return DEV_SENTINEL;
  }
  if (!authConfigured()) return devMode() ? null : null; // production + unconfigured = locked
  const { rows } = await db().query(
    `SELECT id, totp_secret FROM admin_accounts WHERE username = $1 AND disabled_at IS NULL`,
    [username],
  );
  if (!rows[0] || !totpVerify(rows[0].totp_secret, code)) return null;
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  return signAdminSession(rows[0].id, exp, process.env.ADMIN_SESSION_SECRET!);
}

/** The logged-in admin, or null. Screens are read fresh from the DB every
    call (not cached in the cookie) so a revoked grant takes effect on the
    next request, not just the next login. */
export async function currentAdmin(): Promise<AdminSession | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  if (session === DEV_SENTINEL) {
    if (!devMode()) return null;
    return { id: DEV_SENTINEL, username: "dev", screens: new Set(SCREEN_KEYS) };
  }
  if (!authConfigured()) return null;
  const adminId = verifyAdminSession(session, process.env.ADMIN_SESSION_SECRET!);
  if (!adminId) return null;

  const { rows: accountRows } = await db().query(
    `SELECT username FROM admin_accounts WHERE id = $1 AND disabled_at IS NULL`,
    [adminId],
  );
  if (!accountRows[0]) return null; // account deleted/disabled since the session was minted
  const { rows: screenRows } = await db().query(`SELECT screen_key FROM admin_screen_access WHERE admin_id = $1`, [adminId]);
  return { id: adminId, username: accountRows[0].username, screens: new Set(screenRows.map((r) => r.screen_key)) };
}

/** True if ANY admin is logged in, regardless of what they can see --
    gates the admin layout shell (nav chrome, sign-out button) itself, not
    any individual screen's content. */
export async function isAdmin(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

/** The real per-screen gate every admin page/route should check. */
export async function hasAdminAccess(screen: ScreenKey): Promise<boolean> {
  const admin = await currentAdmin();
  return admin ? admin.screens.has(screen) : false;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function sessionMaxAgeSeconds(): number {
  return SESSION_HOURS * 3600;
}

/* ── admin account management (all callers must gate on
   hasAdminAccess("admin_accounts") themselves -- these are trusted lib
   functions, same convention as every other admin mutation in this app) ── */

export interface AdminAccountRow {
  id: string;
  username: string;
  screens: ScreenKey[];
  createdAt: string;
  disabled: boolean;
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  const { rows } = await db().query(
    `SELECT a.id, a.username, a.created_at::date::text AS created_at, a.disabled_at IS NOT NULL AS disabled,
            COALESCE(array_agg(s.screen_key) FILTER (WHERE s.screen_key IS NOT NULL), '{}') AS screens
       FROM admin_accounts a
       LEFT JOIN admin_screen_access s ON s.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.username`,
  );
  return rows.map((r) => ({
    id: r.id, username: r.username, createdAt: r.created_at, disabled: r.disabled, screens: r.screens as ScreenKey[],
  }));
}

/** New account, zero screens granted by default -- an admin creating
    another admin must explicitly opt them into each screen, never inherits
    the creator's own access. Returns the enrollment URI to show ONCE (the
    secret itself is never displayed again after this). */
export async function createAdminAccount(username: string): Promise<{ id: string; enrollmentUri: string }> {
  const secret = generateTotpSecret();
  const { rows } = await db().query(`INSERT INTO admin_accounts (username, totp_secret) VALUES ($1, $2) RETURNING id`, [username, secret]);
  return { id: rows[0].id as string, enrollmentUri: totpEnrollmentUri(secret, username) };
}

export async function setScreenAccess(adminId: string, screen: ScreenKey, granted: boolean): Promise<void> {
  if (granted) {
    await db().query(`INSERT INTO admin_screen_access (admin_id, screen_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [adminId, screen]);
  } else {
    await db().query(`DELETE FROM admin_screen_access WHERE admin_id = $1 AND screen_key = $2`, [adminId, screen]);
  }
}

/** Soft-disable -- an existing session for this admin stops working on its
    NEXT request (currentAdmin() re-checks disabled_at every call, never
    just once at login), not just after their session would have expired
    naturally. */
export async function setAdminDisabled(adminId: string, disabled: boolean): Promise<void> {
  await db().query(`UPDATE admin_accounts SET disabled_at = ${disabled ? "now()" : "NULL"} WHERE id = $1`, [adminId]);
}
