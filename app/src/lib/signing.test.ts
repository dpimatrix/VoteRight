import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { chainHash, fingerprint, verifySignature } from "./signing";

// Mirrors what a client (Web Crypto exportKey("raw") or @noble/ed25519) produces:
// a raw 32-byte Ed25519 public key, base64-encoded — never PEM/DER/JWK on the wire.
function generateRawKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  const rawPublicKeyB64 = Buffer.from(jwk.x, "base64url").toString("base64");
  return { privateKey, rawPublicKeyB64 };
}

function sign(privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"], payload: string) {
  return cryptoSign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64");
}

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    const { privateKey, rawPublicKeyB64 } = generateRawKeypair();
    const payload = "argument:thread-1:hello world";
    const signature = sign(privateKey, payload);
    expect(verifySignature(payload, signature, rawPublicKeyB64)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const { privateKey, rawPublicKeyB64 } = generateRawKeypair();
    const signature = sign(privateKey, "original payload");
    expect(verifySignature("tampered payload", signature, rawPublicKeyB64)).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const a = generateRawKeypair();
    const b = generateRawKeypair();
    const signature = sign(a.privateKey, "same payload");
    expect(verifySignature("same payload", signature, b.rawPublicKeyB64)).toBe(false);
  });

  it("rejects malformed input instead of throwing", () => {
    expect(verifySignature("x", "not-base64!!", "also-not-a-key")).toBe(false);
  });
});

describe("fingerprint", () => {
  it("is deterministic for the same key", () => {
    const { rawPublicKeyB64 } = generateRawKeypair();
    expect(fingerprint(rawPublicKeyB64)).toBe(fingerprint(rawPublicKeyB64));
  });

  it("differs across distinct keys", () => {
    const a = generateRawKeypair();
    const b = generateRawKeypair();
    expect(fingerprint(a.rawPublicKeyB64)).not.toBe(fingerprint(b.rawPublicKeyB64));
  });
});

describe("chainHash", () => {
  it("is deterministic given the same inputs", () => {
    expect(chainHash("prev", "payload", "sig")).toBe(chainHash("prev", "payload", "sig"));
  });

  it("changes if the previous hash changes (this is what makes the chain tamper-evident)", () => {
    expect(chainHash("prev-a", "payload", "sig")).not.toBe(chainHash("prev-b", "payload", "sig"));
  });

  it("changes if the payload changes", () => {
    expect(chainHash("prev", "payload-a", "sig")).not.toBe(chainHash("prev", "payload-b", "sig"));
  });

  it("accepts a null previous hash for the first-ever entry", () => {
    expect(() => chainHash(null, "payload", "sig")).not.toThrow();
  });
});
