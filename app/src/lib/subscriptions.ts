import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { db } from "./db";
import { getPaymentSettings } from "./paymentVerification";

/* Membership & sustainability funding (ARCHITECTURE.md §14, 2026-08-19).
   Recurring Stripe Billing subscriptions -- deliberately separate Stripe
   surface (Checkout Sessions in 'subscription' mode + the hosted Billing
   Portal) from paymentVerification.ts's one-time PaymentIntent flow for
   payment_verified. Same Stripe secret key (one account), but its own
   webhook destination/secret, so this never touches the
   already-verified-live payment_verified webhook path.

   THE GOVERNING CONSTRAINT (§14, restated here since every function below
   must honor it): no tier here may EVER affect voting weight, ballot
   completeness, match accuracy, or debate participation -- those are
   payment_verified's domain alone, untouched by anything in this file. */

export type Tier = "supporter" | "patron" | "champion";
const TIER_ORDER: Tier[] = ["supporter", "patron", "champion"];

export interface SubscriptionPlan {
  tier: Tier;
  displayName: string;
  priceDisplay: string | null;
  stripePriceId: string | null;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { rows } = await db().query(
    `SELECT tier, display_name, price_display, stripe_price_id FROM subscription_plans ORDER BY
       CASE tier WHEN 'supporter' THEN 1 WHEN 'patron' THEN 2 WHEN 'champion' THEN 3 END`,
  );
  return rows.map((r) => ({ tier: r.tier, displayName: r.display_name, priceDisplay: r.price_display, stripePriceId: r.stripe_price_id }));
}

export async function updateSubscriptionPlan(
  tier: Tier,
  opts: { displayName?: string; priceDisplay?: string; stripePriceId?: string },
): Promise<void> {
  await db().query(
    `UPDATE subscription_plans SET
       display_name = COALESCE($2, display_name),
       price_display = COALESCE($3, price_display),
       stripe_price_id = COALESCE($4, stripe_price_id),
       updated_at = now()
     WHERE tier = $1`,
    [tier, opts.displayName ?? null, opts.priceDisplay ?? null, opts.stripePriceId ?? null],
  );
}

export interface SubscriptionSettings {
  stripeWebhookSecret: string | null;
}

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  const { rows } = await db().query(`SELECT stripe_webhook_secret FROM subscription_settings WHERE id = 1`);
  return { stripeWebhookSecret: rows[0].stripe_webhook_secret };
}

export async function updateSubscriptionSettings(opts: { stripeWebhookSecret?: string }): Promise<void> {
  await db().query(
    `UPDATE subscription_settings SET stripe_webhook_secret = COALESCE($1, stripe_webhook_secret), updated_at = now() WHERE id = 1`,
    [opts.stripeWebhookSecret ?? null],
  );
}

export class SubscriptionsNotConfigured extends Error {
  constructor(detail: string) {
    super(`Subscriptions aren't fully configured yet: ${detail}. Set it up in /admin/subscriptions.`);
  }
}

async function stripeForBilling(): Promise<Stripe> {
  // Reuses the SAME Stripe secret key payment_verified uses (one Stripe
  // account, two different products -- PaymentIntents there, Billing
  // here) -- no separate "billing secret key" field to configure.
  const settings = await getPaymentSettings();
  if (!settings.stripe) throw new SubscriptionsNotConfigured("no Stripe secret key on file (set it up in /admin/payments first)");
  return new Stripe(settings.stripe.secretKey);
}

/** Active tier only -- a lapsed/canceled subscription is 'none' regardless
    of what subscription_tier still says (that column records the LAST
    tier, subscription_status says whether it's actually in force). */
export async function currentTier(userId: string): Promise<Tier | "none"> {
  const { rows } = await db().query(`SELECT subscription_tier, subscription_status FROM users WHERE id = $1`, [userId]);
  const r = rows[0];
  if (!r || !r.subscription_tier || !["active", "trialing"].includes(r.subscription_status)) return "none";
  return r.subscription_tier as Tier;
}

export async function hasTierAtLeast(userId: string, min: Tier): Promise<boolean> {
  const tier = await currentTier(userId);
  if (tier === "none") return false;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

/** Redirects to Stripe Checkout in subscription mode. successUrl/cancelUrl
    are full URLs the caller builds (so this stays lang-agnostic). */
export async function createCheckoutSession(
  userId: string,
  tier: Tier,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const plans = await getSubscriptionPlans();
  const plan = plans.find((p) => p.tier === tier);
  if (!plan?.stripePriceId) throw new SubscriptionsNotConfigured(`no Stripe Price configured for the ${tier} tier`);
  const stripe = await stripeForBilling();
  const { rows } = await db().query(`SELECT stripe_customer_id FROM users WHERE id = $1`, [userId]);
  const existingCustomerId = rows[0]?.stripe_customer_id as string | null;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: existingCustomerId ?? undefined,
    client_reference_id: userId,
    metadata: { voteright_user_id: userId, voteright_tier: tier },
    subscription_data: { metadata: { voteright_user_id: userId, voteright_tier: tier } },
  });
  return session.url!;
}

/** Only for an existing subscriber (needs a Stripe customer id already on
    file) -- Stripe's own hosted portal handles cancel/upgrade/payment
    method/invoice history from here, none of that UI is built in this app. */
export async function createBillingPortalSession(userId: string, returnUrl: string): Promise<string | null> {
  const { rows } = await db().query(`SELECT stripe_customer_id FROM users WHERE id = $1`, [userId]);
  const customerId = rows[0]?.stripe_customer_id as string | null;
  if (!customerId) return null;
  const stripe = await stripeForBilling();
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  return session.url;
}

function tierFromStripeSubscription(sub: Stripe.Subscription): Tier | null {
  const t = sub.metadata?.voteright_tier;
  return t === "supporter" || t === "patron" || t === "champion" ? t : null;
}

/** Verifies the Stripe-Signature header against subscription_settings'
    OWN webhook secret (distinct from payment_settings') and syncs
    users.subscription_tier/status/stripe_customer_id/period_end. Never
    trust a webhook body without this. */
export async function handleSubscriptionWebhook(rawBody: string, signatureHeader: string): Promise<void> {
  const settings = await getSubscriptionSettings();
  if (!settings.stripeWebhookSecret) throw new SubscriptionsNotConfigured("no webhook secret on file");
  const stripe = await stripeForBilling();
  const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, settings.stripeWebhookSecret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.voteright_user_id;
    if (!userId || typeof session.customer !== "string") return;
    await db().query(`UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, [userId, session.customer]);
    return;
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const tier = tierFromStripeSubscription(sub);
    const userId = sub.metadata?.voteright_user_id;
    if (!userId || !tier) return;
    const periodEnd = sub.items.data[0]?.current_period_end;
    await db().query(
      `UPDATE users SET subscription_tier = $2, subscription_status = $3, subscription_current_period_end = to_timestamp($4)
         WHERE id = $1`,
      [userId, tier, sub.status, periodEnd ?? null],
    );
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.voteright_user_id;
    if (!userId) return;
    await db().query(`UPDATE users SET subscription_status = 'canceled' WHERE id = $1`, [userId]);
  }
}

/* ── Champion-tier API keys (§14.1) ── */

function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Revokes any existing active key for this user first -- one live key at
    a time, matching the "generate to see it, regenerate to rotate"
    pattern used elsewhere in this app (the debate-post signing key export
    flow). Returns the raw key ONCE; only its hash is ever stored. */
export async function generateApiKey(userId: string): Promise<string> {
  const raw = `vr_live_${randomBytes(24).toString("hex")}`;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE api_keys SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
    await client.query(`INSERT INTO api_keys (user_id, key_hash) VALUES ($1, $2)`, [userId, hashApiKey(raw)]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return raw;
}

/** Returns the owning userId if the key is valid and unrevoked, else null.
    Touches last_used_at (best-effort, not awaited-critical) for the
    admin's own visibility into which keys are actually in use. */
export async function verifyApiKey(rawKey: string): Promise<string | null> {
  const { rows } = await db().query(
    `UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1 AND revoked_at IS NULL RETURNING user_id`,
    [hashApiKey(rawKey)],
  );
  return rows[0]?.user_id ?? null;
}

/* ── Supporter+ CSV export (§14.1) ── */

export function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** A resident's own priorities as CSV -- their own data, in a format they
    can open in a spreadsheet. Not "match history" (no historical
    snapshot table exists -- see §14.2's honest note on what's deferred). */
export async function exportPrioritiesCsv(userId: string): Promise<string> {
  const { rows } = await db().query(
    `SELECT t.name AS topic, vp.statement, vp.importance_weight, vp.created_at::date::text AS date
       FROM voter_priorities vp JOIN topics t ON t.id = vp.topic_id
      WHERE vp.user_id = $1
      ORDER BY t.name`,
    [userId],
  );
  const header = "Topic,Statement,Importance (1-5),Date\n";
  const body = rows.map((r) => [r.topic, r.statement, r.importance_weight, r.date].map((v) => csvEscape(String(v))).join(",")).join("\n");
  return header + body + (body ? "\n" : "");
}

/* ── Admin visibility ── */

/** Champion-tier bulk export (§14.1) -- a machine-readable mirror of the
    SAME data already public on candidate profile pages: name, party,
    current office, and jurisdiction. Deliberately v1-scoped (not every
    sub-resource -- promises/votes/sponsorships/money each have their own
    shape and are a real follow-up, not squeezed into one giant endpoint
    to look more complete than it is). */
export async function bulkCandidateExport(): Promise<
  { id: string; fullName: string; party: string | null; office: string | null; jurisdiction: string | null }[]
> {
  const { rows } = await db().query(
    `SELECT p.id, p.full_name, p.party, o.title AS office, j.name AS jurisdiction
       FROM politicians p
       LEFT JOIN offices o ON o.id = p.current_office_id
       LEFT JOIN jurisdictions j ON j.ocd_id = o.jurisdiction_id
      ORDER BY j.name NULLS LAST, o.title NULLS LAST, p.full_name`,
  );
  return rows.map((r) => ({ id: r.id, fullName: r.full_name, party: r.party, office: r.office, jurisdiction: r.jurisdiction }));
}

export async function adminSubscriptionCounts(): Promise<Record<Tier, number>> {
  const { rows } = await db().query(
    `SELECT subscription_tier AS tier, count(*)::int AS n FROM users
      WHERE subscription_tier IS NOT NULL AND subscription_status IN ('active', 'trialing')
      GROUP BY subscription_tier`,
  );
  const out: Record<Tier, number> = { supporter: 0, patron: 0, champion: 0 };
  for (const r of rows) out[r.tier as Tier] = r.n;
  return out;
}
