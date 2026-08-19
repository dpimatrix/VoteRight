import { bulkCandidateExport, verifyApiKey } from "@/lib/subscriptions";

/* Champion-tier bulk export (ARCHITECTURE.md §14.1). X-API-Key header,
   not a session cookie -- this is meant to be called from a script/
   research pipeline, not a browser. Same data already public on candidate
   profile pages, just machine-readable; nothing here is gated data. */
export async function GET(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!key) return Response.json({ error: "missing X-API-Key header" }, { status: 401 });
  const userId = await verifyApiKey(key);
  if (!userId) return Response.json({ error: "invalid or revoked API key" }, { status: 401 });
  const candidates = await bulkCandidateExport();
  return Response.json({ candidates });
}
