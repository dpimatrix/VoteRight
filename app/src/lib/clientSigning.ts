/* Browser-side half of the non-repudiation design (ARCHITECTURE.md Section 10).
   Generates and holds an Ed25519 keypair via Web Crypto, entirely client-side -
   the private key is generated `extractable: true` (needed for the passphrase-
   encrypted backup/export flow) and never leaves the browser except through
   that explicit, deliberate export path. Requires a browser with Web Crypto
   Ed25519 support (current Chrome/Firefox/Safari); this module must only ever
   be imported from "use client" components. */

const DB_NAME = "voteright-signing";
const STORE = "keys";
const RECORD_ID = "primary";

interface KeyRecord {
  id: string;
  privateKey: CryptoKey;
  publicKeyRawB64: string;
  fingerprint: string;
  registered: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadRecord(): Promise<KeyRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(RECORD_ID);
    req.onsuccess = () => resolve((req.result as KeyRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveRecord(record: KeyRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function base64UrlToBytes(b64url: string): Uint8Array {
  return base64ToBytes(b64url.replace(/-/g, "+").replace(/_/g, "/"));
}

function base64Url(bytes: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Must match app/src/lib/signing.ts's fingerprint() exactly - both hash the raw
// public key bytes with SHA-256, base64url-encode, and take the first 22 chars.
async function fingerprintOf(rawPublicKey: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", rawPublicKey.buffer as ArrayBuffer);
  return base64Url(digest).slice(0, 22);
}

async function registerIfNeeded(record: KeyRecord): Promise<KeyRecord> {
  if (record.registered) return record;
  const res = await fetch("/api/keys/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicKey: record.publicKeyRawB64 }),
  });
  if (res.ok) {
    record.registered = true;
    await saveRecord(record);
  }
  return record;
}

/** Loads the stored keypair, generating and registering a new one on first use.
    Safe to call before every signing operation - it's a no-op after the first
    call in a given browser. */
export async function ensureSigningKey(): Promise<{ publicKeyRawB64: string; fingerprint: string }> {
  let record = await loadRecord();
  if (!record) {
    const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    record = {
      id: RECORD_ID,
      privateKey: pair.privateKey,
      publicKeyRawB64: bytesToBase64(rawPublicKey),
      fingerprint: await fingerprintOf(rawPublicKey),
      registered: false,
    };
    await saveRecord(record);
  }
  record = await registerIfNeeded(record);
  return { publicKeyRawB64: record.publicKeyRawB64, fingerprint: record.fingerprint };
}

export async function signPayload(canonicalPayload: string): Promise<{ signature: string; publicKeyFingerprint: string }> {
  const record = await loadRecord();
  if (!record) throw new Error("no signing key - call ensureSigningKey() first");
  const data = new TextEncoder().encode(canonicalPayload);
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, record.privateKey, data);
  return { signature: bytesToBase64(new Uint8Array(sig)), publicKeyFingerprint: record.fingerprint };
}

let cachedUserId: string | null = null;

/** The current session's user id, as the server resolves it - needed client-side
    only to build the exact canonical payload string the server will reconstruct
    (see app/src/lib/canonical.ts). Cached for the page lifetime. */
export async function currentUserIdForSigning(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const res = await fetch("/api/whoami");
  const body = (await res.json()) as { userId: string };
  cachedUserId = body.userId;
  return cachedUserId;
}

/** Passphrase-encrypted backup/export - a deliberate, discussed tradeoff:
    recoverable at the cost of a leaked-backup impersonation risk, mitigated by
    revokeAndRotate() below. The private key is exported raw, encrypted with
    AES-GCM under a key derived from the user's passphrase via PBKDF2 (600,000
    iterations, OWASP's 2023 minimum for PBKDF2-SHA256) - the passphrase itself
    never leaves the browser, and the file that leaves the device is ciphertext
    only, never the raw key. */
const PBKDF2_ITERATIONS = 600_000;

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedBackup {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
}

export async function exportEncryptedBackup(passphrase: string): Promise<EncryptedBackup> {
  const record = await loadRecord();
  if (!record) throw new Error("no signing key to export");
  const rawPrivateKey = await crypto.subtle.exportKey("pkcs8", record.privateKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const backupKey = await deriveBackupKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, backupKey, rawPrivateKey);
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/** Restores a key from an encrypted backup - wrong passphrase throws (AES-GCM's
    auth tag fails to verify) rather than silently producing garbage.

    Identity recovery (2026-08-19): unlike a freshly generated key (plain
    /api/keys/register), a RESTORED key might belong to a different,
    already-existing identity than this session's current cookie -- e.g.
    the whole point of a deliberate restore after a reset. Goes through
    /api/keys/recover instead, which re-points this session at that
    identity server-side if so (see anon.ts's adoptIdentity()). Returns
    whether that actually happened, so the UI (KeySettings.tsx) can show a
    real "welcome back" instead of a plain "key restored" and reload to
    pick up the recovered identity's own data everywhere else on the page. */
export async function importEncryptedBackup(backup: EncryptedBackup, passphrase: string): Promise<{ recovered: boolean }> {
  const salt = base64ToBytes(backup.saltB64);
  const iv = base64ToBytes(backup.ivB64);
  const ciphertext = base64ToBytes(backup.ciphertextB64);
  const backupKey = await deriveBackupKey(passphrase, salt);
  let rawPrivateKey: ArrayBuffer;
  try {
    rawPrivateKey = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      backupKey,
      ciphertext.buffer as ArrayBuffer,
    );
  } catch {
    throw new Error("wrong passphrase, or the backup file is corrupted");
  }
  const privateKey = await crypto.subtle.importKey("pkcs8", rawPrivateKey, { name: "Ed25519" }, true, ["sign"]);
  // An Ed25519 private key's own JWK export always includes its public
  // component (RFC 8037's `x` field) alongside the private scalar (`d`) -
  // reading it back out this way avoids a fragile "reconstruct a public
  // CryptoKey" round trip.
  const jwk = (await crypto.subtle.exportKey("jwk", privateKey)) as { x: string };
  const rawPublicKey = base64UrlToBytes(jwk.x);
  const publicKeyRawB64 = bytesToBase64(rawPublicKey);

  const res = await fetch("/api/keys/recover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicKey: publicKeyRawB64 }),
  });
  const body = (await res.json()) as { recovered: boolean };

  await saveRecord({
    id: RECORD_ID,
    privateKey,
    publicKeyRawB64,
    fingerprint: await fingerprintOf(rawPublicKey),
    registered: true,
  });
  return { recovered: body.recovered };
}

/** Revokes the current key (e.g. after a backup is suspected leaked) and
    immediately establishes a new one in its place, in one server-side
    transaction (POST /api/keys/rotate) - past signatures under the old key
    stay valid; only new signing moves to the new key. */
export async function revokeAndRotate(): Promise<void> {
  const record = await loadRecord();
  if (!record) throw new Error("no signing key to revoke");
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const rawPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const newPublicKeyRawB64 = bytesToBase64(rawPublicKey);
  const res = await fetch("/api/keys/rotate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ oldFingerprint: record.fingerprint, newPublicKey: newPublicKeyRawB64 }),
  });
  if (!res.ok) throw new Error("rotation failed server-side");
  await saveRecord({
    id: RECORD_ID,
    privateKey: pair.privateKey,
    publicKeyRawB64: newPublicKeyRawB64,
    fingerprint: await fingerprintOf(rawPublicKey),
    registered: true,
  });
}
