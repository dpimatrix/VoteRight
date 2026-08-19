import { adoptIdentity, currentOrNewUserId } from "@/lib/anon";
import { db } from "@/lib/db";
import { fingerprint as fingerprintOf, hashContext, ownerOfValidKey } from "@/lib/signing";

/* Identity recovery (2026-08-19) -- the "restore from a backup" counterpart
   to /api/keys/register, called from clientSigning.ts's
   importEncryptedBackup() instead of a blind register. A freshly generated
   key (first-ever use) still goes through the plain /register endpoint --
   this one specifically handles the case where the restored key might
   belong to a DIFFERENT, already-existing identity than the current
   session's fresh cookie. See anon.ts's adoptIdentity() and signing.ts's
   ownerOfValidKey() for the two halves of the actual mechanism. */
export async function POST(request: Request) {
  const { publicKey } = (await request.json()) as { publicKey?: string };
  if (!publicKey) return Response.json({ error: "publicKey required" }, { status: 400 });

  const currentUserId = await currentOrNewUserId();
  const fp = fingerprintOf(publicKey);
  const context = hashContext(
    request.headers.get("x-forwarded-for") ?? "unknown",
    request.headers.get("user-agent") ?? "unknown",
  );

  const ownerId = await ownerOfValidKey(fp);

  // No prior valid owner (a genuinely new key, or one that's since been
  // rotated/revoked away -- see ownerOfValidKey's doc comment on why a
  // revoked backup can never reach this branch) -- or it's already this
  // same session's own key. Either way, nothing to recover: register it
  // plainly under whoever's asking, same as /api/keys/register.
  if (!ownerId || ownerId === currentUserId) {
    await db().query(
      `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
       VALUES ($1, 'registered', $2, $3, $4)`,
      [currentUserId, publicKey, fp, context],
    );
    return Response.json({ recovered: false, fingerprint: fp });
  }

  // Real recovery: this key belongs to a DIFFERENT, still-valid identity.
  // Log the event on the identity being recovered (not the abandoned fresh
  // session), then re-point this session's cookie at it.
  await db().query(
    `INSERT INTO user_key_events (user_id, event, public_key, public_key_fingerprint, context_hash)
     VALUES ($1, 'recovered', $2, $3, $4)`,
    [ownerId, publicKey, fp, context],
  );
  await adoptIdentity(ownerId);
  return Response.json({ recovered: true, fingerprint: fp });
}
