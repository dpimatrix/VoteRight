import { currentOrNewUserId } from "@/lib/anon";
import { redirectTo, siteOrigin } from "@/lib/redirect";
import { createCheckoutSession, SubscriptionsNotConfigured } from "@/lib/subscriptions";

/* Gated on bare identity (mint-if-needed), not address/payment
   verification -- supporting the platform financially is deliberately
   NOT conditioned on having gone through the civic-participation flow at
   all (§14: subscriptions are a support relationship, orthogonal to
   payment_verified). */
export async function POST(request: Request) {
  const userId = await currentOrNewUserId();
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const tier = String(form.get("tier") ?? "");
  if (!["supporter", "patron", "champion"].includes(tier)) return new Response("bad tier", { status: 400 });

  // Real bug found live 2026-08-19: request.url's origin is the VPS's
  // internal 127.0.0.1:3001 bind address behind the Apache reverse proxy,
  // not the public domain -- see redirect.ts's siteOrigin() doc comment.
  // A real subscriber completed a real charge and got redirected straight
  // to an unreachable localhost URL.
  const origin = siteOrigin(request);
  try {
    const url = await createCheckoutSession(
      userId,
      tier as "supporter" | "patron" | "champion",
      `${origin}/subscribe?lang=${lang}&subscribed=1`,
      `${origin}/subscribe?lang=${lang}`,
    );
    return Response.redirect(url, 303);
  } catch (e) {
    if (e instanceof SubscriptionsNotConfigured) return redirectTo(`/subscribe?lang=${lang}&error=not_configured`, request);
    throw e;
  }
}
