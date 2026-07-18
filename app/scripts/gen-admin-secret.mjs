// One-time setup: generate the admin TOTP + session secrets and the otpauth://
// URI to enroll in an authenticator app. Usage: node scripts/gen-admin-secret.mjs
import { randomBytes } from "node:crypto";

function base32Encode(buf) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

const totpSecret = base32Encode(randomBytes(20)); // 160-bit, RFC 4226 recommended
const sessionSecret = randomBytes(32).toString("hex");

console.log("ADMIN_TOTP_SECRET=" + totpSecret);
console.log("ADMIN_SESSION_SECRET=" + sessionSecret);
console.log("");
console.log("Enroll in any authenticator app (Google Authenticator, Aegis, 1Password …):");
console.log(`  otpauth://totp/VoteRight%20Admin?secret=${totpSecret}&issuer=VoteRight&digits=6&period=30`);
console.log("or add manually: account 'VoteRight Admin', key above, time-based, 6 digits.");
