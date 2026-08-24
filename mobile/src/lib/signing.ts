/* Mobile half of the non-repudiation design (ARCHITECTURE.md Section 10) — the
   native equivalent of app/src/lib/clientSigning.ts. React Native has no
   reliable native Ed25519 (Web Crypto isn't available), so this uses
   @noble/curves (pure JS, audited) instead, with the private key held in
   expo-secure-store (iOS Keychain / Android Keystore-backed) rather than
   IndexedDB. Both sides must produce byte-identical base64 encodings for a
   signature to verify — see the matching notes in signing.ts on the server.

   Backup/export and identity recovery added 2026-08-24, closing a real
   gap the owner ran into directly: reinstalling the app mints a brand
   new anonymous identity with no link back to the old one, silently
   orphaning verification, priorities, debate history, and payment_verified
   status — exactly the problem web's own backup/restore (migration 088,
   ARCHITECTURE.md §10.3) was built to solve, just never carried over here
   (this file's own comment used to say so explicitly). Same design, ported
   to what's actually available in Hermes rather than assumed from web:
   AES-256-GCM + PBKDF2-SHA256 via @noble/ciphers/@noble/hashes (same
   audited "noble" family already trusted here for signing itself) instead
   of Web Crypto's crypto.subtle, which RN doesn't have. Revoke/rotate
   (web's mitigation for a leaked backup file) is NOT built here — a real,
   deliberately separate follow-up, not silently assumed done. */
import { ed25519 } from '@noble/curves/ed25519.js';
import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import * as Crypto from 'expo-crypto';

import { adoptSessionId, get, post } from '@/services/api';

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

/** Passphrase-encrypted backup/export — mirrors web's clientSigning.ts
    exactly in shape and work factor (same EncryptedBackup fields, same
    600,000 PBKDF2-SHA256 iterations, OWASP's 2023 minimum), ported to
    @noble/ciphers' AES-GCM since RN has no Web Crypto. The private key
    here is already a raw 32-byte scalar (ed25519.keygen()'s own format)
    rather than web's PKCS8-wrapped CryptoKey export — genuinely simpler
    to serialize, not a shortcut taken at security's expense. */
const PBKDF2_ITERATIONS = 600_000;

export interface EncryptedBackup {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  // Async, not the plain sync pbkdf2 — 600k iterations in pure JS (no
  // native-thread offload the way a browser's Web Crypto gets) would
  // otherwise block Hermes's single JS thread for a real, user-visible
  // stretch. asyncTick lets the scheduler breathe between chunks of work
  // instead of freezing the UI for the whole derivation.
  return pbkdf2Async(sha256, passphrase, salt, { c: PBKDF2_ITERATIONS, dkLen: 32, asyncTick: 10 });
}

export async function exportEncryptedBackup(passphrase: string): Promise<EncryptedBackup> {
  const record = await loadRecord();
  if (!record) throw new Error('no signing key to export');
  const secretKey = base64ToBytes(record.secretKeyB64);
  const salt = Crypto.getRandomValues(new Uint8Array(16));
  const iv = Crypto.getRandomValues(new Uint8Array(12));
  const backupKey = await deriveBackupKey(passphrase, salt);
  const ciphertext = gcm(backupKey, iv).encrypt(secretKey);
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(ciphertext),
  };
}

/** Restores a key from an encrypted backup — a wrong passphrase throws
    (AES-GCM's own auth tag fails to verify) rather than silently
    producing garbage, same as web.

    Identity recovery: unlike ensureSigningKey()'s plain
    POST /api/keys/register for a freshly generated key, a RESTORED key
    might belong to a different, already-existing identity than this
    session's current one — the whole point of a deliberate restore.
    Goes through POST /api/keys/recover instead, mirroring web's own
    importEncryptedBackup(); the difference is what happens with a real
    recovery. Web re-points a cookie server-side (anon.ts's
    adoptIdentity()) with nothing more for the client to do. Mobile has
    no cookie jar — the recovered identity's own original session id
    comes back in the response body instead (server-side: the same
    adoptIdentity() call, its return value now actually used) and gets
    persisted via services/api.ts's adoptSessionId(), overwriting this
    installation's fresh one so every subsequent request carries the
    recovered identity. cachedUserId is reset so the next
    currentUserIdForSigning() call re-fetches instead of serving the
    now-stale pre-recovery id. */
export async function importEncryptedBackup(
  backup: EncryptedBackup,
  passphrase: string,
): Promise<{ recovered: boolean }> {
  const salt = base64ToBytes(backup.saltB64);
  const iv = base64ToBytes(backup.ivB64);
  const ciphertext = base64ToBytes(backup.ciphertextB64);
  const backupKey = await deriveBackupKey(passphrase, salt);
  let secretKey: Uint8Array;
  try {
    secretKey = gcm(backupKey, iv).decrypt(ciphertext);
  } catch {
    throw new Error('wrong passphrase, or the backup file is corrupted');
  }
  const publicKey = ed25519.getPublicKey(secretKey);
  const publicKeyB64 = bytesToBase64(publicKey);
  const fingerprint = fingerprintOf(publicKey);

  const res = await post<{ recovered: boolean; anonId?: string }>('/api/keys/recover', { publicKey: publicKeyB64 });

  if (res.recovered && res.anonId) {
    adoptSessionId(res.anonId);
    cachedUserId = null;
  }

  await saveRecord({
    secretKeyB64: bytesToBase64(secretKey),
    publicKeyB64,
    fingerprint,
    registered: true,
  });
  return { recovered: res.recovered };
}
