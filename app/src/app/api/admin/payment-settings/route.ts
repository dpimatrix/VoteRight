import { hasAdminAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { updatePaymentSettings } from "@/lib/paymentVerification";

function str(form: FormData, name: string): string | undefined {
  const v = form.get(name);
  return v !== null && String(v).trim() !== "" ? String(v).trim() : undefined;
}

export async function POST(request: Request) {
  if (!(await hasAdminAccess("payments"))) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  // Four separate forms on the page (general/stripe/authorizenet/check) all
  // post here -- 'section' says which one, so e.g. saving Stripe keys never
  // touches the check-payment checkbox (whose ABSENCE from a form it isn't
  // part of would otherwise look identical to "explicitly unchecked").
  const section = String(form.get("section") ?? "");

  if (section === "general") {
    // Unlike the vendor-key fields below, blank here is never "leave
    // unchanged" -- there's no valid state where the fee is simply unset
    // after a save was attempted, so an empty/invalid submission is a real
    // error, not silently ignored. Real bug found live 2026-08-19: this
    // used to accept blank the same permissive way the key fields do,
    // which let a save silently no-op with zero visible error -- the fee
    // stayed NULL for a full round of "is it configured yet?"
    // troubleshooting before the gap was found.
    const feeDollars = str(form, "fee_dollars");
    if (!feeDollars) return new Response("fee is required", { status: 400 });
    const feeCents = Math.round(Number(feeDollars) * 100);
    if (!Number.isFinite(feeCents) || feeCents <= 0) return new Response("bad fee", { status: 400 });
    const activeGateway = form.get("active_gateway");
    if (activeGateway && !["stripe", "authorizenet"].includes(String(activeGateway))) return new Response("bad gateway", { status: 400 });
    await updatePaymentSettings({
      feeCents,
      activeGateway: activeGateway ? (String(activeGateway) as "stripe" | "authorizenet") : undefined,
    });
  } else if (section === "stripe") {
    await updatePaymentSettings({
      stripeSecretKey: str(form, "stripe_secret_key"),
      stripePublishableKey: str(form, "stripe_publishable_key"),
      stripeWebhookSecret: str(form, "stripe_webhook_secret"),
    });
  } else if (section === "authorizenet") {
    const env = form.get("authorizenet_environment");
    await updatePaymentSettings({
      authorizenetApiLoginId: str(form, "authorizenet_api_login_id"),
      authorizenetTransactionKey: str(form, "authorizenet_transaction_key"),
      authorizenetPublicClientKey: str(form, "authorizenet_public_client_key"),
      authorizenetSignatureKey: str(form, "authorizenet_signature_key"),
      authorizenetEnvironment: env === "production" ? "production" : env === "sandbox" ? "sandbox" : undefined,
    });
  } else if (section === "check") {
    await updatePaymentSettings({
      checkPaymentEnabled: form.has("check_payment_enabled"),
      checkInstructions: form.get("check_instructions") !== null ? String(form.get("check_instructions")) : undefined,
    });
  } else if (section === "donation_tiers") {
    // Same direct-not-str() reading as check_instructions above: these
    // Price IDs are shown to the admin in full (not masked like secrets),
    // so blank here is a deliberate "clear this tier's Price" rather than
    // "leave unchanged" -- str()'s blank-means-undefined would make that
    // impossible.
    const priceId = (name: string) => (form.get(name) !== null ? String(form.get(name)).trim() : undefined);
    await updatePaymentSettings({
      donationPriceId20: priceId("donation_price_id_20"),
      donationPriceId50: priceId("donation_price_id_50"),
      donationPriceId100: priceId("donation_price_id_100"),
      donationPriceId500: priceId("donation_price_id_500"),
      donationPriceId1000: priceId("donation_price_id_1000"),
      // Unlike the Price IDs above, this one IS a secret (masked on the
      // page like stripe_webhook_secret is) -- str()'s blank-means-
      // unchanged convention, not direct-read.
      donationWebhookSecret: str(form, "donation_webhook_secret"),
    });
  } else {
    return new Response("unknown section", { status: 400 });
  }
  return redirectTo("/admin/payments", request);
}
