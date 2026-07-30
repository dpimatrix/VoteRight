/* Mobile half of the non-repudiation design (ARCHITECTURE.md Section 10) — the
   native equivalent of app/src/lib/clientSigning.ts. React Native has no
   reliable native Ed25519 (Web Crypto isn't available), so this uses
   @noble/curves (pure JS, audited) instead, with the private key held in
   expo-secure-store (iOS Keychain / Android Keystore-backed) rather than
   IndexedDB. Both sides must produce byte-identical base64 encodings for a
   signature to verify — see the matching notes in signing.ts on the server.

   Scope note: this only covers the core sign/register path needed for
   write actions (arguments, proposals, seconds). Passphrase-encrypted
   backup/export and revoke/rotate — present on web — are deferred to the
   mobile Privacy/key-settings screen, a separate piece of work. */
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { get, post } from '@/services/api';

// Imported lazily (not at module scope) because expo-secure-store's native
// module isn't necessarily compiled into every installed build yet — Expo
// Router eagerly evaluates every screen file to build its route table at app
// startup, so a static import here would crash the whole app on boot rather
// than just failing this one signing call (which every caller already treats
// as best-effort and falls back to unsigned on failure).
async function secureStore() {
  return import('expo-secure-store');
}

const STORE_KEY = 'voteright-signing-key';

interface KeyRecord {
  secretKeyB64: string;
  publicKeyB64: string;
  fingerprint: string;
  registered: boolean;
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : B64_ALPHABET[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : B64_ALPHABET[b2 & 63];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const c of clean) {
    const val = B64_ALPHABET.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Must match signing.ts's fingerprint() exactly: SHA-256 of the raw public
// key bytes, base64url-encoded, first 22 chars.
function fingerprintOf(rawPublicKey: Uint8Array): string {
  return base64Url(sha256(rawPublicKey)).slice(0, 22);
}

async function loadRecord(): Promise<KeyRecord | null> {
  const SecureStore = await secureStore();
  const raw = await SecureStore.getItemAsync(STORE_KEY);
  return raw ? (JSON.parse(raw) as KeyRecord) : null;
}

async function saveRecord(record: KeyRecord): Promise<void> {
  const SecureStore = await secureStore();
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(record));
}

async function registerIfNeeded(record: KeyRecord): Promise<KeyRecord> {
  if (record.registered) return record;
  try {
    await post('/api/keys/register', { publicKey: record.publicKeyB64 });
    record.registered = true;
    await saveRecord(record);
  } catch (e) {
    console.error('Key registration failed (will retry next signed action):', e);
  }
  return record;
}

/** Loads the stored keypair, generating and registering a new one on first
    use. Safe to call before every signing operation. */
export async function ensureSigningKey(): Promise<{ publicKeyB64: string; fingerprint: string }> {
  let record = await loadRecord();
  if (!record) {
    const { secretKey, publicKey } = ed25519.keygen();
    record = {
      secretKeyB64: bytesToBase64(secretKey),
      publicKeyB64: bytesToBase64(publicKey),
      fingerprint: fingerprintOf(publicKey),
      registered: false,
    };
    await saveRecord(record);
  }
  record = await registerIfNeeded(record);
  return { publicKeyB64: record.publicKeyB64, fingerprint: record.fingerprint };
}

export async function signPayload(
  canonicalPayload: string,
): Promise<{ signature: string; publicKeyFingerprint: string }> {
  const record = await loadRecord();
  if (!record) throw new Error('no signing key — call ensureSigningKey() first');
  const secretKey = base64ToBytes(record.secretKeyB64);
  const data = new TextEncoder().encode(canonicalPayload);
  const sig = ed25519.sign(data, secretKey);
  return { signature: bytesToBase64(sig), publicKeyFingerprint: record.fingerprint };
}

let cachedUserId: string | null = null;

/** The current session's user id, as the server resolves it — needed to
    build the exact canonical payload string the server will reconstruct
    (see mobile/src/lib/canonical.ts). Cached for the app's lifetime. */
export async function currentUserIdForSigning(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const res = await get<{ userId: string }>('/api/whoami');
  cachedUserId = res.userId;
  return cachedUserId;
}
