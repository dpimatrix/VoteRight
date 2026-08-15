import { describe, expect, it } from "vitest";
import {
  LOCKOUT_MS,
  MAX_FAILURES,
  WINDOW_MS,
  clientIpFromHeaders,
  isLockedOut,
  recordFailure,
  shouldSweep,
} from "./loginRateLimit";

describe("clientIpFromHeaders", () => {
  it("prefers CF-Connecting-IP when present", () => {
    const headers: Record<string, string> = { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" };
    expect(clientIpFromHeaders((n) => headers[n] ?? null)).toBe("1.2.3.4");
  });

  it("falls back to the first hop of X-Forwarded-For when CF-Connecting-IP is absent", () => {
    const headers: Record<string, string> = { "x-forwarded-for": "5.6.7.8, 10.0.0.1, 10.0.0.2" };
    expect(clientIpFromHeaders((n) => headers[n] ?? null)).toBe("5.6.7.8");
  });

  it("falls back to a shared 'unknown' bucket when neither header is present", () => {
    expect(clientIpFromHeaders(() => null)).toBe("unknown");
  });
});

describe("recordFailure / isLockedOut", () => {
  it("does not lock out before MAX_FAILURES is reached", () => {
    const now = 1_000_000;
    let entry = undefined as Awaited<ReturnType<typeof recordFailure>> | undefined;
    for (let i = 0; i < MAX_FAILURES - 1; i++) entry = recordFailure(entry, now);
    expect(entry!.failures).toBe(MAX_FAILURES - 1);
    expect(isLockedOut(entry, now)).toBe(false);
  });

  it("locks out exactly on the MAX_FAILURES-th failure, for LOCKOUT_MS", () => {
    const now = 1_000_000;
    let entry = undefined as ReturnType<typeof recordFailure> | undefined;
    for (let i = 0; i < MAX_FAILURES; i++) entry = recordFailure(entry, now);
    expect(entry!.failures).toBe(MAX_FAILURES);
    expect(isLockedOut(entry, now)).toBe(true);
    expect(isLockedOut(entry, now + LOCKOUT_MS - 1)).toBe(true);
    expect(isLockedOut(entry, now + LOCKOUT_MS + 1)).toBe(false);
  });

  it("resets the failure count once the counting window has elapsed", () => {
    const start = 1_000_000;
    let entry = recordFailure(undefined, start);
    expect(entry.failures).toBe(1);
    // A failure just inside the window keeps accumulating...
    entry = recordFailure(entry, start + WINDOW_MS - 1);
    expect(entry.failures).toBe(2);
    // ...but one after the window starts a fresh count instead of continuing to 3.
    entry = recordFailure(entry, start + WINDOW_MS + 1);
    expect(entry.failures).toBe(1);
  });

  it("undefined (no prior entry) is never locked out", () => {
    expect(isLockedOut(undefined, Date.now())).toBe(false);
  });
});

describe("shouldSweep", () => {
  it("does not sweep a currently-locked entry even if its counting window has elapsed", () => {
    const now = 1_000_000;
    let entry = undefined as ReturnType<typeof recordFailure> | undefined;
    for (let i = 0; i < MAX_FAILURES; i++) entry = recordFailure(entry, now);
    // Window elapsed, but still within the lockout period -- must not be swept.
    expect(shouldSweep(entry!, now + WINDOW_MS + 1)).toBe(false);
  });

  it("sweeps once both the lockout and the counting window have expired", () => {
    const now = 1_000_000;
    let entry = undefined as ReturnType<typeof recordFailure> | undefined;
    for (let i = 0; i < MAX_FAILURES; i++) entry = recordFailure(entry, now);
    expect(shouldSweep(entry!, now + LOCKOUT_MS + WINDOW_MS + 1)).toBe(true);
  });

  it("sweeps a below-threshold entry once its counting window alone has expired", () => {
    const now = 1_000_000;
    const entry = recordFailure(undefined, now); // 1 failure, never locked
    expect(shouldSweep(entry, now + WINDOW_MS + 1)).toBe(true);
  });
});
