import { currentOrNewUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";

/* The web client-side signing code needs its own user id to build the exact
   canonical payload the server will reconstruct and verify against (see
   app/src/lib/canonical.ts) - this is the cookie-resolved identity, the same
   one every other route already uses via currentOrNewUserId(). `tier` lets
   mobile gate write-action UI (§9) without a second round trip. */
export async function GET() {
  const userId = await currentOrNewUserId();
  const tier = await userTier(userId);
  return Response.json({ userId, tier });
}
