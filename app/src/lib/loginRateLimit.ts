/* Pure decision logic for the admin login per-IP lockout (see
   api/admin/login/route.ts for the full rationale and threat model). Kept
   separate from the route so the actual lockout/window/reset arithmetic is
   unit-testable, matching this codebase's pattern elsewhere (pure lib
   functions get tests; the DB/cookie/request-touching route around them
   doesn't). The route owns the actual Map instance -- everything here is a
   pure function over plain values. */

export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60_000;
export const WINDOW_MS = 5 * 60_000; // failures older than this don't count toward a fresh lockout

export interface Attempt {
  failures: number;
  windowStart: number;
  lockedUntil: number; // 0 means "not locked", not null -- keeps callers simpler
}

export function isLockedOut(entry: Attempt | undefined, now: number): boolean {
  return !!entry && entry.lockedUntil > now;
}

/** Given the entry (if any) for an IP that just failed, returns its new
    state. A failure outside the counting window starts a fresh window
    rather than accumulating forever. */
export function recordFailure(entry: Attempt | undefined, now: number): Attempt {
  const fresh = !entry || now - entry.windowStart > WINDOW_MS;
  const failures = (fresh ? 0 : entry.failures) + 1;
  const windowStart = fresh ? now : entry.windowStart;
  return { failures, windowStart, lockedUntil: failures >= MAX_FAILURES ? now + LOCKOUT_MS : 0 };
}

/** An entry is safe to garbage-collect once its lockout (if any) has
    expired AND its counting window has also expired -- both, not either,
    so a currently-locked entry is never swept early. */
export function shouldSweep(entry: Attempt, now: number): boolean {
  return entry.lockedUntil < now && now - entry.windowStart > WINDOW_MS;
}

/** Cloudflare overwrites CF-Connecting-IP at its edge with the real
    observed connecting IP for any request that actually goes through it
    (Proxied mode, DEPLOY.md) -- unspoofable in that path, unlike
    X-Forwarded-For, which the rest of this app only ever uses for a coarse
    audit-context hash where spoofing resistance doesn't matter as much.
    Falls back to X-Forwarded-For's first hop, then a shared "unknown"
    bucket, if Cloudflare's own header is somehow missing (e.g. the VPS's
    origin IP is reachable directly, bypassing Cloudflare entirely -- a
    residual gap only an origin firewall rule closes, not app code). */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const cf = get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}
