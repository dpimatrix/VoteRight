import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { canonicalKeyProofPayload, fingerprint, hashContext, verifySignature } from "@/lib/signing";

/* Registers a participant's signing public key (client-generated Ed25519 keypair,
   private key never sent — see docs/ARCHITECTURE.md §10 non-repudiation design).
   A user may hold multiple concurrently-valid keys (e.g. one per device) — this
   only ever ADDS a 'registered' event, never replaces one (see /rotate/revoke).

   Real vulnerability found live 2026-08-29: this used to accept ANY public key
   with zero proof the caller held the matching PRIVATE key. Public keys are
   deliberately public (attached to every signed argument/proposal/second) --
   an attacker who'd merely SEEN a victim's key could POST it here under the
   attacker's own session, becoming the most-recent (hence "current owner")
   user_key_events row for that fingerprint. When the real victim later
   restored their actual backup on a new device, /api/keys/recover's
   ownerOfValidKey() would resolve to the ATTACKER, and adoptIdentity() would
   silently hand the victim's own device the attacker's identity instead of
   the victim's own -- full identity hijack, triggerable by anyone who's ever
   seen the target's public key, no compromise of anything actually secret
   required. proofSignature -- a signature over canonicalKeyProofPayload,
   made with the SAME key being registered, bound to this exact session's own
   userId -- closes it: only whoever actually holds the private key can ever
   produce a valid one, for any session. */
export async function POST(request: Request) {
  const { publicKey, proofSignature } = (await request.json()) as { publicKey?: string; proofSignature?: string };
  if (!publicKey || !proofSignature) return Response.json({ error: "publicKey and proofSignature required" }, { status: 400 });

  const userId = await currentOrNewUserId();
  const fp = fingerprint(publicKey);
  if (!verifySignature(canonicalKeyProofPayload({ userId, fingerprint: fp }), proofSignature, publicKey)) {
    return Response.json({ error: "proof of key possession failed to verify" }, { status: 400 });
  }
  const context = hashContext(
    request.headers.get("x-forwarded-for") ?? "unknown",
    request.headers.get("user-agent") ?? "unknown",
  );

  await db().query(
    `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
     VALUES ($1, 'registered', $2, $3, $4)`,
    [userId, publicKey, fp, context],
  );

  return Response.json({ fingerprint: fp });
}
