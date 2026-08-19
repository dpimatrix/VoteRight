import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { hasAdminAccess } from "@/lib/adminAuth";
import { adminSubscriptionCounts, getSubscriptionPlans, getSubscriptionSettings } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

function mask(key: string | null): string {
  if (!key) return "";
  return key.length <= 8 ? "•".repeat(key.length) : `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

export default async function AdminSubscriptionsPage() {
  if (!(await hasAdminAccess("subscriptions"))) return <AdminAccessDenied screen="subscriptions" />;
  const plans = await getSubscriptionPlans();
  const settings = await getSubscriptionSettings();
  const counts = await adminSubscriptionCounts();

  return (
    <>
      <div className="pagetitle">Membership subscriptions</div>
      <p className="sub">
        ARCHITECTURE.md §14 — recurring Stripe Billing, separate from the one-time payment_verified flow on the
        Payments screen. Governing constraint: no tier here may ever affect voting weight, ballot completeness,
        match accuracy, or debate participation — those stay exactly as payment_verified alone governs them.
      </p>

      <div className="grouph">Subscriber counts</div>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        {plans.map((p) => (
          <div className="card" key={p.tier} style={{ flex: "1 1 140px", padding: "0.6rem 0.8rem" }}>
            <div className="cover">{p.displayName}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>{counts[p.tier]}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Webhook</h3>
        <form className="admform" method="post" action="/api/admin/subscriptions" style={{ display: "block" }}>
          <input type="hidden" name="section" value="webhook" />
          <label className="nopos" style={{ display: "block", margin: "0.15rem 0" }}>
            Stripe webhook signing secret{" "}
            {settings.stripeWebhookSecret && <span className="mono">(currently {mask(settings.stripeWebhookSecret)})</span>}
          </label>
          <input type="password" name="stripe_webhook_secret" placeholder="whsec_… (leave blank to keep current)" style={{ width: "100%" }} />
          <p className="nopos" style={{ margin: "0.4rem 0" }}>
            A SEPARATE Stripe webhook destination from the one on the Payments screen — Dashboard → Developers →
            Webhooks → Add endpoint → <code>/api/subscriptions/webhook</code>, events{" "}
            <code>checkout.session.completed</code>, <code>customer.subscription.created</code>,{" "}
            <code>customer.subscription.updated</code>, <code>customer.subscription.deleted</code>.
          </p>
          <button className="btn" type="submit" style={{ marginTop: "0.5rem" }}>Save</button>
        </form>
      </div>

      {plans.map((p) => (
        <div className="card" key={p.tier}>
          <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>{p.displayName}</h3>
          <form className="admform" method="post" action="/api/admin/subscriptions" style={{ display: "block" }}>
            <input type="hidden" name="section" value="plan" />
            <input type="hidden" name="tier" value={p.tier} />
            <label className="nopos" style={{ display: "block", margin: "0.15rem 0" }}>Display name</label>
            <input type="text" name="display_name" defaultValue={p.displayName} style={{ width: "100%" }} />
            <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>Price label (display only — the real charge is set on the Stripe Price)</label>
            <input type="text" name="price_display" defaultValue={p.priceDisplay ?? ""} placeholder="$4/mo" style={{ width: "100%" }} />
            <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
              Stripe Price ID {!p.stripePriceId && <span style={{ color: "var(--differ)" }}>— not set, checkout disabled for this tier</span>}
            </label>
            <input type="text" name="stripe_price_id" defaultValue={p.stripePriceId ?? ""} placeholder="price_…" style={{ width: "100%" }} />
            <button className="btn" type="submit" style={{ marginTop: "0.5rem" }}>Save {p.displayName}</button>
          </form>
        </div>
      ))}
    </>
  );
}
