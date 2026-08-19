import { hasAdminAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { updateSubscriptionPlan, updateSubscriptionSettings, type Tier } from "@/lib/subscriptions";

function str(form: FormData, name: string): string | undefined {
  const v = form.get(name);
  return v !== null && String(v).trim() !== "" ? String(v).trim() : undefined;
}

export async function POST(request: Request) {
  if (!(await hasAdminAccess("subscriptions"))) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const section = String(form.get("section") ?? "");

  if (section === "webhook") {
    await updateSubscriptionSettings({ stripeWebhookSecret: str(form, "stripe_webhook_secret") });
  } else if (section === "plan") {
    const tier = String(form.get("tier") ?? "");
    if (!["supporter", "patron", "champion"].includes(tier)) return new Response("bad tier", { status: 400 });
    await updateSubscriptionPlan(tier as Tier, {
      displayName: str(form, "display_name"),
      priceDisplay: str(form, "price_display"),
      stripePriceId: str(form, "stripe_price_id"),
    });
  } else {
    return new Response("unknown section", { status: 400 });
  }
  return redirectTo("/admin/subscriptions", request);
}
