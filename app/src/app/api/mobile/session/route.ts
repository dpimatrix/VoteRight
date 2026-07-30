import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/queries";

/* Bootstrap endpoint for the native app's anonymous identity (no cookie jar
   available to it — see mobile/services/api.ts). Idempotent: a client that
   already has a session id just gets it re-confirmed; a fresh client gets a
   newly minted one back in the response body to persist locally. */
export async function POST(request: Request) {
  const existing = request.headers.get("x-voteright-session");
  const sessionId = existing ?? randomUUID();
  await ensureUser(sessionId);
  return Response.json({ sessionId });
}
