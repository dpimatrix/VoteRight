import { currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { fingerprint, hashContext } from "@/lib/signing";

/* Registers a participant's signing public key (client-generated Ed25519 keypair,
   private key never sent — see docs/ARCHITECTURE.md §10 non-repudiation design).
   A user may hold multiple concurrently-valid keys (e.g. one per device) — this
   only ever ADDS a 'registered' event, never replaces one (see /rotate/revoke). */
export async function POST(request: Request) {
  const { publicKey } = (await request.json()) as { publicKey?: string };
  if (!publicKey) return Response.json({ error: "publicKey required" }, { status: 400 });

  const userId = await currentOrNewUserId();
  const fp = fingerprint(publicKey);
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
