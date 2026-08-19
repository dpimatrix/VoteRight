import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, signAdminSession, totpCode, totpVerify, verifyAdminSession } from "./adminAuth";

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

describe("admin session signing (per-admin, 2026-08-19)", () => {
  const secret = "test-session-secret";
  const adminId = "11111111-1111-4111-8111-111111111111";
  it("round-trips a future expiry, returning the signed admin id", () => {
    const v = signAdminSession(adminId, Date.now() + 60_000, secret);
    expect(verifyAdminSession(v, secret)).toBe(adminId);
  });
  it("rejects expired sessions", () => {
    const v = signAdminSession(adminId, Date.now() - 1_000, secret);
    expect(verifyAdminSession(v, secret)).toBeNull();
  });
  it("rejects a tampered admin id (can't claim to be a different admin)", () => {
    const exp = Date.now() + 60_000;
    const v = signAdminSession(adminId, exp, secret);
    const otherAdminId = "22222222-2222-4222-8222-222222222222";
    const tampered = `${otherAdminId}.${exp}.${v.split(".")[2]}`;
    expect(verifyAdminSession(tampered, secret)).toBeNull();
  });
  it("rejects tampered expiry and wrong key", () => {
    const exp = Date.now() + 60_000;
    const v = signAdminSession(adminId, exp, secret);
    const tampered = `${adminId}.${exp + 3600_000}.${v.split(".")[2]}`;
    expect(verifyAdminSession(tampered, secret)).toBeNull();
    expect(verifyAdminSession(v, "other-secret")).toBeNull();
    expect(verifyAdminSession("garbage", secret)).toBeNull();
  });
});

describe("base32Encode", () => {
  it("round-trips through base32Decode", () => {
    const buf = Buffer.from("12345678901234567890", "ascii");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
});
