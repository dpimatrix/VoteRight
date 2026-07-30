import { verifiedUserId } from "@/lib/anon";
import { castBallot } from "@/lib/referenda";

/* §10.1: this handler is on the redemption code path — it must never log,
   trace, or persist the (user, choice) pair it necessarily sees in transit.
   That applies to both branches below: neither ever writes `choice` anywhere
   but the castBallot() call itself. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const userId = await verifiedUserId();

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const { choice } = (await request.json()) as { choice?: string };
    const outcome = await castBallot(id, userId, String(choice ?? ""));
    return Response.json({ outcome });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const choice = String(form.get("choice") ?? "");
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  await castBallot(id, userId, choice);
  return Response.redirect(new URL(`/referenda/${id}?lang=${lang}`, request.url), 303);
}
