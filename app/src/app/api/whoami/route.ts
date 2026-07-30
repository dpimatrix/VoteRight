import { currentOrNewUserId } from "@/lib/anon";

/* The web client-side signing code needs its own user id to build the exact
   canonical payload the server will reconstruct and verify against (see
   app/src/lib/canonical.ts) - this is the cookie-resolved identity, the same
   one every other route already uses via currentOrNewUserId(). */
export async function GET() {
  const userId = await currentOrNewUserId();
  return Response.json({ userId });
}
