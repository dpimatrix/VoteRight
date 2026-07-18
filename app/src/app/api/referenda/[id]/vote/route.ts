import { verifiedUserId } from "@/lib/anon";
import { castBallot } from "@/lib/referenda";

/* §10.1: this handler is on the redemption code path — it must never log,
   trace, or persist the (user, choice) pair it necessarily sees in transit. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const choice = String(form.get("choice") ?? "");
  const userId = await verifiedUserId();
  if (!userId) return Response.redirect(new URL(`/verify?lang=${lang}`, request.url), 303);
  await castBallot(id, userId, choice);
  return Response.redirect(new URL(`/referenda/${id}?lang=${lang}`, request.url), 303);
}
