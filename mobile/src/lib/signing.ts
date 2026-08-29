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
import { reassociatePushToken } from '@/lib/pushNotifications';

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
    @noble/ciphers' AES-GCM since RN has no Web Crypto.

    Real bug caught in review, not live yet: web encrypts
    crypto.subtle.exportKey("pkcs8", ...) — a 48-byte PKCS8 DER structure,
    not the bare 32-byte scalar ed25519.keygen() itself produces. A first
    version of this file encrypted the raw scalar directly, which would
    have decrypted fine (same passphrase, same cipher) but produced 32
    wrong-shaped bytes wherever the OTHER platform tried to read it back —
    ed25519.getPublicKey() on a PKCS8 blob, or Web Crypto's own
    importKey("pkcs8", ...) on a bare scalar, are both silent-garbage or
    hard-failure territory, not a clean error. Since recovering a mobile
    backup on web (or a web backup on mobile) is the whole point of this
    feature — ARCHITECTURE.md §10.3 explicitly frames it as "another
    device... keeps working too" — same-platform-only would have quietly
    broken half of what backup/restore is for. Fixed by wrapping/unwrapping
    the exact same PKCS8 DER prefix Web Crypto emits for Ed25519 (RFC 8410
    §10.3; independently confirmed against Node's own
    crypto.generateKeyPairSync('ed25519').export({type:'pkcs8',
    format:'der'}) rather than trusting one source) so both platforms
    encrypt byte-identical plaintext. */
const PBKDF2_ITERATIONS = 600_000;

// RFC 8410's Ed25519 PKCS8 structure has no variable fields besides the
// raw 32-byte key itself (no parameters, no optional fields) — this
// 16-byte prefix is universal, not something to derive per-key.
const PKCS8_ED25519_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function toPkcs8(rawSecretKey: Uint8Array): Uint8Array {
  const out = new Uint8Array(PKCS8_ED25519_PREFIX.length + rawSecretKey.length);
  out.set(PKCS8_ED25519_PREFIX, 0);
  out.set(rawSecretKey, PKCS8_ED25519_PREFIX.length);
  return out;
}

function fromPkcs8(pkcs8: Uint8Array): Uint8Array {
  const prefixLen = PKCS8_ED25519_PREFIX.length;
  if (pkcs8.length !== prefixLen + 32 || !PKCS8_ED25519_PREFIX.every((b, i) => pkcs8[i] === b)) {
    throw new Error('not a valid Ed25519 PKCS8 key');
  }
  return pkcs8.slice(prefixLen);
}

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
  // PKCS8-wrapped, not the bare scalar -- see this function's own header
  // comment on why: byte-identical to what web's exportKey("pkcs8", ...)
  // produces, so a backup made here decrypts to something web's importKey
  // can actually load, and vice versa.
  const ciphertext = gcm(backupKey, iv).encrypt(toPkcs8(secretKey));
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
    // Unwraps the PKCS8 prefix too -- see exportEncryptedBackup's own
    // comment. fromPkcs8 throws on anything not shaped like the Ed25519
    // PKCS8 structure it expects, which lands in the same catch as a
    // failed decrypt: either way, this wasn't a valid VoteRight backup
    // for the passphrase given, and that's the only distinction the user
    // needs.
    secretKey = fromPkcs8(gcm(backupKey, iv).decrypt(ciphertext));
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
    // Found live 2026-08-29: this device's push token (registered at boot,
    // under whatever fresh identity a new install started with) otherwise
    // stays pointed at that pre-recovery identity in push_tokens until the
    // app happens to fully relaunch -- silently breaking push delivery for
    // the identity actually in use for the rest of this session. Best-
    // effort, same posture as registration itself -- a failure here must
    // never block recovery from completing.
    void reassociatePushToken();
  }

  await saveRecord({
    secretKeyB64: bytesToBase64(secretKey),
    publicKeyB64,
    fingerprint,
    registered: true,
  });
  return { recovered: res.recovered };
}
