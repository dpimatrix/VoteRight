import { currentOrNewUserId } from "@/lib/anon";
import { redirectTo, siteOrigin } from "@/lib/redirect";
import { createBillingPortalSession } from "@/lib/subscriptions";

export async function POST(request: Request) {
  const userId = await currentOrNewUserId();
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  // Same fix as checkout/route.ts -- see redirect.ts's siteOrigin() doc comment.
  const origin = siteOrigin(request);
  const url = await createBillingPortalSession(userId, `${origin}/subscribe?lang=${lang}`);
  if (!url) return redirectTo(`/subscribe?lang=${lang}`, request); // not a subscriber yet, nothing to manage
  return Response.redirect(url, 303);
}
