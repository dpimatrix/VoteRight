import { currentOrNewUserId } from "@/lib/anon";
import { verifyAddress } from "@/lib/debates";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const userId = await currentOrNewUserId();
  const ok = await verifyAddress(userId, String(form.get("address") ?? ""));
  return Response.redirect(new URL(ok ? `/debates?lang=${lang}` : `/verify?bad=1&lang=${lang}`, request.url), 303);
}
