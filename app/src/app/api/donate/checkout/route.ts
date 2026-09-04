import { currentOrNewUserId } from "@/lib/anon";
import { startDonationCheckout } from "@/lib/donations";
import { redirectTo, siteOrigin } from "@/lib/redirect";

/* Voluntary donation checkout (migration 099, replacing the admin-pasted
   Stripe Payment Links from 098 -- see startDonationCheckout's own comment).
   Gated on bare identity only (mint-if-needed, currentOrNewUserId), not
   payment_verified -- same "support is orthogonal to the civic-
   participation flow" posture subscriptions/checkout already takes (see
   that route's own comment, §14). The tile that posts here is only ever
   SHOWN once payment_verified (verify/payment page.tsx, verify-payment.tsx),
   but nothing about the charge itself depends on that tier -- there's no
   reason a donation attempt should fail differently than the tile being
   hidden already prevents.

   Dual-mode like every other route in this family: web's plain <form
   method="post"> here (no client JS needed, Stripe's own hosted page does
   everything after the redirect); mobile's JSON POST gets the Checkout
   Session URL back to open in an in-app browser (ExternalLink's underlying
   mechanism) instead of following a redirect itself. */
export async function POST(request: Request) {
  await currentOrNewUserId();
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const origin = siteOrigin(request);

  // Dollars over the wire, not cents -- same convention admin's own
  // fee_dollars field already uses (payment-settings/route.ts), converted
  // to cents at this one boundary rather than asking every caller (web's
  // plain <form>, mobile's typed-in "More" amount) to do fixed-point
  // arithmetic itself.
  let amountDollars: number;
  let lang: string;
  if (isJson) {
    const b = (await request.json()) as { amountDollars?: number; lang?: string };
    amountDollars = Number(b.amountDollars);
    lang = b.lang ?? "en";
  } else {
    const form = await request.formData();
    amountDollars = Number(form.get("amount_dollars"));
    lang = String(form.get("lang") ?? "en");
  }
  const amountCents = Math.round(amountDollars * 100);

  const result = await startDonationCheckout(amountCents, {
    successUrl: `${origin}/verify/payment?lang=${lang}&donated=1`,
    cancelUrl: `${origin}/verify/payment?lang=${lang}`,
  });

  if (!result.ok) {
    if (isJson) return Response.json({ error: result.reason }, { status: 400 });
    return redirectTo(`/verify/payment?lang=${lang}&error=${result.reason}`, request);
  }

  if (isJson) return Response.json({ url: result.url });
  // Stripe's own absolute URL, not an internal path -- Response.redirect
  // directly rather than redirectTo() (which builds against this app's own
  // siteOrigin, wrong host entirely for a checkout.stripe.com destination).
  return Response.redirect(result.url, 303);
}
