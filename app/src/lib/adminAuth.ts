import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Real admin auth (closes the DEPLOY.md launch gate): TOTP (RFC 6238 — any
   authenticator app) + HMAC-signed, expiring session cookies. No third-party
   identity provider, no client JS, fail-closed in production when
   unconfigured. Env:
     ADMIN_TOTP_SECRET   base32 secret enrolled in the operator's authenticator
     ADMIN_SESSION_SECRET random key that signs session cookies
   Dev fallback (NODE_ENV !== 'production' only): the old ADMIN_TOKEN gate
   keeps local work friction-free. */

const SESSION_COOKIE = "vr_admin_session";
const SESSION_HOURS = 12;

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

/* ── signed session (value = exp.hmac(exp)) ── */
export function signSession(expiresAtMs: number, secret: string): string {
  const sig = createHmac("sha256", secret).update(String(expiresAtMs)).digest("hex");
  return `${expiresAtMs}.${sig}`;
}

export function verifySession(value: string, secret: string, nowMs = Date.now()): boolean {
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  if (!/^\d+$/.test(exp) || Number(exp) < nowMs) return false;
  const expected = Buffer.from(signSession(Number(exp), secret));
  const actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ── harness ── */
function devMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function authConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET && process.env.ADMIN_SESSION_SECRET);
}

/** Verify a submitted authenticator code and mint a session cookie value,
    or null if refused. Production without configuration fails closed. */
export function loginWithCode(code: string): string | null {
  if (authConfigured()) {
    if (!totpVerify(process.env.ADMIN_TOTP_SECRET!, code)) return null;
    const exp = Date.now() + SESSION_HOURS * 3600_000;
    return signSession(exp, process.env.ADMIN_SESSION_SECRET!);
  }
  if (devMode()) {
    // Legacy dev gate: the shared token doubles as the "code" locally.
    return code === (process.env.ADMIN_TOKEN ?? "dev-admin") ? "dev" : null;
  }
  return null; // production + unconfigured = locked
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (session) {
    if (authConfigured()) return verifySession(session, process.env.ADMIN_SESSION_SECRET!);
    return devMode() && session === "dev";
  }
  return false;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function sessionMaxAgeSeconds(): number {
  return SESSION_HOURS * 3600;
}
