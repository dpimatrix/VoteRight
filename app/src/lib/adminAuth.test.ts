import { describe, expect, it } from "vitest";
import { base32Decode, signSession, totpCode, totpVerify, verifySession } from "./adminAuth";

// RFC 6238 Appendix B test vectors (SHA-1). The ASCII seed "12345678901234567890"
// is GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ in base32. The RFC lists 8-digit codes;
// our 6-digit codes are the same values mod 10^6.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32Decode", () => {
  it("decodes the RFC seed to the ASCII bytes", () => {
    expect(base32Decode(RFC_SECRET).toString("ascii")).toBe("12345678901234567890");
  });
  it("tolerates lowercase, spaces, and padding", () => {
    expect(base32Decode("gezd gnbv gy3t qojq GEZDGNBVGY3TQOJQ==").toString("ascii")).toBe(
      "12345678901234567890",
    );
  });
  it("rejects invalid characters", () => {
    expect(() => base32Decode("1nvalid!")).toThrow();
  });
});

describe("totpCode (RFC 6238 vectors, SHA-1, mod 10^6)", () => {
  const vectors: [number, string][] = [
    [59_000, "287082"], // RFC: 94287082
    [1_111_111_109_000, "081804"], // RFC: 07081804
    [1_234_567_890_000, "005924"], // RFC: 89005924
    [20_000_000_000_000, "353130"], // RFC: 65353130
  ];
  for (const [t, expected] of vectors) {
    it(`T=${t / 1000}s → ${expected}`, () => {
      expect(totpCode(RFC_SECRET, t)).toBe(expected);
    });
  }
});

describe("totpVerify", () => {
  it("accepts the current code and ±1 step of clock skew", () => {
    const now = 1_234_567_890_000;
    expect(totpVerify(RFC_SECRET, totpCode(RFC_SECRET, now), now)).toBe(true);
    expect(totpVerify(RFC_SECRET, totpCode(RFC_SECRET, now - 30_000), now)).toBe(true);
    expect(totpVerify(RFC_SECRET, totpCode(RFC_SECRET, now + 30_000), now)).toBe(true);
  });
  it("rejects codes two steps away and malformed input", () => {
    const now = 1_234_567_890_000;
    expect(totpVerify(RFC_SECRET, totpCode(RFC_SECRET, now - 90_000), now)).toBe(false);
    expect(totpVerify(RFC_SECRET, "12345", now)).toBe(false);
    expect(totpVerify(RFC_SECRET, "abcdef", now)).toBe(false);
  });
});

describe("session signing", () => {
  const secret = "test-session-secret";
  it("round-trips a future expiry", () => {
    const v = signSession(Date.now() + 60_000, secret);
    expect(verifySession(v, secret)).toBe(true);
  });
  it("rejects expired sessions", () => {
    const v = signSession(Date.now() - 1_000, secret);
    expect(verifySession(v, secret)).toBe(false);
  });
  it("rejects tampered expiry and wrong key", () => {
    const exp = Date.now() + 60_000;
    const v = signSession(exp, secret);
    const tampered = `${exp + 3600_000}.${v.split(".")[1]}`;
    expect(verifySession(tampered, secret)).toBe(false);
    expect(verifySession(v, "other-secret")).toBe(false);
    expect(verifySession("garbage", secret)).toBe(false);
  });
});
