import { redirectTo } from "@/lib/redirect";
import { cookies } from "next/headers";
import { loginWithCode, sessionCookieName, sessionMaxAgeSeconds } from "@/lib/adminAuth";
import { type Attempt, clientIpFromHeaders, isLockedOut, recordFailure, shouldSweep } from "@/lib/loginRateLimit";

/* Real per-IP lockout (added 2026-08-15), replacing a per-request delay that
   only throttled SEQUENTIAL attempts — a concurrent burst paid the same 1s
   delay in parallel, so enough concurrency could still work through a good
   chunk of a TOTP code's ~90s validity window (10^6 possible codes) before
   it rotated. The delay's own original comment reasoned this was
   "serverless-friendly" because "a per-IP store would not survive across
   instances anyway" — that reasoning is now stale: this app moved off
   Vercel to a single persistent systemd --user process on one VPS
   (DEPLOY.md), so an in-memory store actually works and persists for the
   process's lifetime. Module-level Map, not a DB table — this is the only
   place in the app that needs this, and losing it on a restart (a deploy
   event, not something an attacker controls) is fine.

   The check-and-increment below is synchronous (no `await` between reading
   and writing an entry), so it's race-free under Node's single-threaded
   event loop even with many concurrent requests hitting it at once. See
   loginRateLimit.ts for the lockout arithmetic (unit-tested) and the IP
   header choice/its residual gap. */
const attempts = new Map<string, Attempt>();

export async function POST(request: Request) {
  const ip = clientIpFromHeaders((name) => request.headers.get(name));
  const now = Date.now();
  for (const [k, a] of attempts) if (shouldSweep(a, now)) attempts.delete(k); // bound the map's growth over a long process lifetime

  if (isLockedOut(attempts.get(ip), now)) {
    // Locked out — don't even look at the code a locked-out IP submits.
    await new Promise((r) => setTimeout(r, 1000));
    return redirectTo("/admin", request);
  }

  const form = await request.formData();
  const code = String(form.get("token") ?? "").trim();
  const session = loginWithCode(code);

  if (session) {
    attempts.delete(ip); // a successful login clears any prior failure count
    const store = await cookies();
    store.set(sessionCookieName(), session, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds(),
    });
  } else {
    attempts.set(ip, recordFailure(attempts.get(ip), now));
    await new Promise((r) => setTimeout(r, 1000)); // keep the existing per-attempt cost too
  }
  return redirectTo("/admin", request);
}
