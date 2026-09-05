import { randomInt } from "node:crypto";
import { db } from "./db";
import { createStripeIntent, handleStripeWebhook, type StripeCreds } from "./paymentGateways/stripe";

/* Payment-as-verification (2026-08-19 decision, migration 085). A
   successful card charge or ACH/eCheck transfer -- tied to a real name/bank
   account -- IS the identity signal here, not a document check. No ID
   upload, no KYC vendor. This replaces the never-built govt_id_verified
   tier ARCHITECTURE.md §13 item 9 left open; see that migration's header
   comment for the full reasoning. Whether to ALSO require an ID upload on
   top of this is a separate, still-open decision this file doesn't
   address.

   Originally multi-gateway (Stripe + Authorize.Net), with both vendors'
   credentials live in payment_settings at once and an active_gateway
   selector between them (see migration 085's own header and
   ARCHITECTURE.md §9.2 for that history). Authorize.Net removed entirely
   (migration 102, 2026-09-05) -- it was never configured or tested against
   a real account, and VoteRight fully committed to Stripe as the sole
   gateway. Stripe is no longer "the active one among several"; it's simply
   the gateway, so the whole active_gateway concept -- and the dropdown that
   used to choose it in /admin/payments -- is gone too, not just
   Authorize.Net's own fields. */

// Kept as a named type (rather than inlining "stripe" everywhere) purely so
// payment_verifications.gateway's still-multi-valued-shaped column has a
// clear source of truth if a second gateway is ever added back.
export type Gateway = "stripe";

// Fixed donation tiers (owner's own literal request: "$20, $50, $100,
// $500, $1000"). Lives here rather than in donations.ts so
// getPublicPaymentConfig() below can compute donationTierAmountsCents
// without an import cycle (donations.ts already imports getPaymentSettings
// from this file); donations.ts imports this constant + the lookup helper
// FROM here instead of defining its own copy.
export const DONATION_TIERS_CENTS = [2000, 5000, 10000, 50000, 100000] as const;

/** Admin-created Stripe Price references for the fixed donation tiles
    (migration 100) -- see createDonationCheckoutSession's own comment for
    why: grouped, clean Stripe reporting instead of an ad-hoc price on
    every tap. A tier left null here isn't broken -- donations.ts falls
    back to an inline price for it, same as "More" always does. */
export interface DonationTierPriceIds {
  d20: string | null;
  d50: string | null;
  d100: string | null;
  d500: string | null;
  d1000: string | null;
}

/** Looks up the configured Stripe Price for one of the five fixed amounts
    above, or null for "More"/an amount that isn't one of the five/a tier
    the admin hasn't configured yet. */
export function donationPriceIdFor(amountCents: number, ids: DonationTierPriceIds): string | null {
  switch (amountCents) {
    case 2000:
      return ids.d20;
    case 5000:
      return ids.d50;
    case 10000:
      return ids.d100;
    case 50000:
      return ids.d500;
    case 100000:
      return ids.d1000;
    default:
      return null;
  }
}

export interface PaymentSettings {
  feeCents: number | null;
  stripe: StripeCreds | null; // null unless BOTH secret+publishable keys are set
  checkPaymentEnabled: boolean;
  checkInstructions: string | null;
  donationTierPriceIds: DonationTierPriceIds;
  // Dedicated webhook secret for donation Checkout Sessions (migration
  // 101) -- its own destination, separate from this file's own fee
  // webhook secret above and from subscription_settings' own, same
  // "deliberately separate Stripe surface" pattern subscriptions.ts
  // already documents for itself.
  donationWebhookSecret: string | null;
  updatedAt: string;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { rows } = await db().query(
    `SELECT fee_cents,
            stripe_secret_key, stripe_publishable_key, stripe_webhook_secret,
            check_payment_enabled, check_instructions,
            donation_price_id_20, donation_price_id_50, donation_price_id_100, donation_price_id_500, donation_price_id_1000,
            donation_webhook_secret,
            updated_at
       FROM payment_settings WHERE id = 1`,
  );
  const r = rows[0];
  return {
    feeCents: r.fee_cents,
    stripe:
      r.stripe_secret_key && r.stripe_publishable_key
        ? { secretKey: r.stripe_secret_key, publishableKey: r.stripe_publishable_key, webhookSecret: r.stripe_webhook_secret }
        : null,
    checkPaymentEnabled: r.check_payment_enabled,
    checkInstructions: r.check_instructions,
    donationTierPriceIds: {
      d20: r.donation_price_id_20,
      d50: r.donation_price_id_50,
      d100: r.donation_price_id_100,
      d500: r.donation_price_id_500,
      d1000: r.donation_price_id_1000,
    },
    donationWebhookSecret: r.donation_webhook_secret,
    updatedAt: r.updated_at,
  };
}

/** Admin-only write -- enforced by the caller (the route handler checks
    admin access before this is ever reached). Every field is optional and
    left untouched (COALESCE) when omitted, so saving one gateway's keys
    never blanks out the other's or the fee -- pass an empty string to
    actually clear a text field. */
export async function updatePaymentSettings(opts: {
  feeCents?: number;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  checkPaymentEnabled?: boolean;
  checkInstructions?: string;
  // Donation tier Stripe Price IDs (migration 100) -- same "blank clears
  // it" convention as checkInstructions: pass "" (not undefined) to
  // actually remove one; the admin route reads submitted-but-empty form
  // fields as "" for exactly this reason (see its own comment).
  donationPriceId20?: string;
  donationPriceId50?: string;
  donationPriceId100?: string;
  donationPriceId500?: string;
  donationPriceId1000?: string;
  // Donation webhook secret (migration 101) -- same "blank clears it"
  // convention as the fields above.
  donationWebhookSecret?: string;
}): Promise<void> {
  await db().query(
    `UPDATE payment_settings SET
       fee_cents = COALESCE($1, fee_cents),
       stripe_secret_key = COALESCE($2, stripe_secret_key),
       stripe_publishable_key = COALESCE($3, stripe_publishable_key),
       stripe_webhook_secret = COALESCE($4, stripe_webhook_secret),
       check_payment_enabled = COALESCE($5, check_payment_enabled),
       check_instructions = COALESCE($6, check_instructions),
       donation_price_id_20 = COALESCE($7, donation_price_id_20),
       donation_price_id_50 = COALESCE($8, donation_price_id_50),
       donation_price_id_100 = COALESCE($9, donation_price_id_100),
       donation_price_id_500 = COALESCE($10, donation_price_id_500),
       donation_price_id_1000 = COALESCE($11, donation_price_id_1000),
       donation_webhook_secret = COALESCE($12, donation_webhook_secret),
       updated_at = now()
     WHERE id = 1`,
    [
      opts.feeCents ?? null,
      opts.stripeSecretKey ?? null,
      opts.stripePublishableKey ?? null,
      opts.stripeWebhookSecret ?? null,
      opts.checkPaymentEnabled ?? null,
      opts.checkInstructions ?? null,
      opts.donationPriceId20 ?? null,
      opts.donationPriceId50 ?? null,
      opts.donationPriceId100 ?? null,
      opts.donationPriceId500 ?? null,
      opts.donationPriceId1000 ?? null,
      opts.donationWebhookSecret ?? null,
    ],
  );
}

/** $5.00-style display, cents in, dollars-and-cents string out. Pure, unit-tested. */
export function formatFeeCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface PublicPaymentConfig {
  feeCents: number | null;
  configured: boolean;
  checkPaymentEnabled: boolean;
  checkInstructions: string | null;
  // A Stripe PUBLISHABLE key is designed to be public -- it's already shipped
  // to every browser that loads /verify/payment (see PaymentCheckout.tsx's
  // StartResult). Exposing it here too (mobile, 2026-08-19) just lets a
  // native screen init the Stripe SDK before the user commits to paying,
  // instead of only learning it from startCardPayment()'s side-effectful
  // response. Everything else in PaymentSettings (secret keys, webhook
  // secrets) stays server-only -- never add a field here without checking
  // it belongs on this allowlist.
  stripePublishableKey: string | null;
  // Whether the voluntary donation tiles (/api/donate/checkout, dynamic
  // Stripe Checkout Sessions) should render at all.
  //
  // Deliberately NOT exposed here: which of the 5 fixed tiers has an
  // admin-created Stripe Price (migration 100, donationPriceIdFor). Every
  // tile always renders once donationsEnabled is true, regardless of
  // Price-ID configuration -- a tier the admin hasn't gotten to yet still
  // works when tapped (donations.ts falls back to an inline price), so
  // there's no user-facing reason to hide it. Whether a Price ID exists is
  // purely a Stripe-reporting-cleanliness detail, invisible to both
  // platforms' UI on purpose.
  donationsEnabled: boolean;
}

/** The subset of getPaymentSettings() safe to hand to an unauthenticated-
    beyond-address-verification client. Web's /verify/payment gets the full
    settings object server-side (SSR, never serialized to the client);
    mobile has no server-side render, so it needs this over-the-wire
    equivalent -- kept as a strict allowlist rather than omitting a
    denylist of secret fields, so a future new secret field defaults to
    NOT exposed. */
export async function getPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  const settings = await getPaymentSettings();
  return {
    feeCents: settings.feeCents,
    configured: Boolean(settings.feeCents && settings.stripe),
    checkPaymentEnabled: settings.checkPaymentEnabled,
    checkInstructions: settings.checkInstructions,
    stripePublishableKey: settings.stripe?.publishableKey ?? null,
    donationsEnabled: Boolean(settings.stripe),
  };
}

export class PaymentNotConfigured extends Error {
  constructor(detail: string) {
    super(`Payment verification isn't fully configured yet: ${detail}. Set it up in /admin/payments.`);
  }
}

async function insertPending(userId: string, method: "card" | "ach", amountCents: number): Promise<string> {
  const { rows } = await db().query(
    `INSERT INTO payment_verifications (user_id, method, gateway, amount_cents, status)
     VALUES ($1, $2, 'stripe', $3, 'pending') RETURNING id`,
    [userId, method, amountCents],
  );
  return rows[0].id as string;
}

/** Starts a card payment: creates a Stripe PaymentIntent and returns its
    client secret for the Payment Element. */
export async function startCardPayment(
  userId: string,
): Promise<{ recordId: string; feeCents: number; clientSecret: string; publishableKey: string }> {
  const settings = await getPaymentSettings();
  if (!settings.feeCents) throw new PaymentNotConfigured("no fee set");
  if (!settings.stripe) throw new PaymentNotConfigured("Stripe keys missing");

  const { clientSecret, stripeIntentId } = await createStripeIntent(settings.stripe, { amountCents: settings.feeCents, userId });
  const recordId = await insertPending(userId, "card", settings.feeCents);
  await db().query(`UPDATE payment_verifications SET gateway_transaction_id = $1 WHERE id = $2`, [stripeIntentId, recordId]);
  return { recordId, feeCents: settings.feeCents, clientSecret, publishableKey: settings.stripe.publishableKey };
}

async function promoteFromGatewayResult(recordId: string, gatewayTransactionId: string | null, status: "succeeded" | "pending" | "failed"): Promise<void> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Real bug found live 2026-08-29: no guard against downgrading an
    // already-terminal row -- a retried/duplicated call landing here for a
    // record that had already reached 'succeeded' (or a redelivered
    // webhook reporting 'failed' for what actually succeeded) would
    // silently overwrite it, corrupting the audit trail even though the
    // user's actual verification_tier is untouched either way (the tier
    // grant below is itself already idempotent). Only a still-'pending' or
    // still-'processing' row can ever be promoted from here now.
    const { rows } = await client.query(
      `UPDATE payment_verifications SET status = $2, gateway_transaction_id = COALESCE($3, gateway_transaction_id),
         verified_at = CASE WHEN $2 = 'succeeded' THEN now() ELSE verified_at END
       WHERE id = $1 AND status IN ('pending', 'processing') RETURNING user_id`,
      [recordId, status, gatewayTransactionId],
    );
    if (status === "succeeded" && rows[0]) {
      await client.query(`UPDATE users SET verification_tier = 'payment_verified' WHERE id = $1 AND verification_tier != 'payment_verified'`, [
        rows[0].user_id,
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Verifies and dispatches an incoming Stripe webhook. Never trust the body
    without its signature check; that's the only thing standing between
    this endpoint and anyone on the internet minting themselves
    payment_verified for free. */
export async function handleGatewayWebhook(rawBody: string, stripeSignature: string | null): Promise<void> {
  const settings = await getPaymentSettings();
  if (!stripeSignature || !settings.stripe?.webhookSecret) throw new Error("webhook signature present for no configured gateway");

  const result = await handleStripeWebhook(settings.stripe, rawBody, stripeSignature);
  if (result) {
    await db().query(`UPDATE payment_verifications SET method = $2 WHERE gateway = 'stripe' AND gateway_transaction_id = $1`, [
      result.stripeIntentId,
      result.method,
    ]);
    const row = await db().query(`SELECT id FROM payment_verifications WHERE gateway = 'stripe' AND gateway_transaction_id = $1`, [result.stripeIntentId]);
    if (row.rows[0]) await promoteFromGatewayResult(row.rows[0].id, result.stripeIntentId, result.status);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I -- legible when handwritten on a check
function generateCheckReferenceCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** Records intent to pay by check -- no gateway involvement. Returns the
    reference code + mailing instructions to show the user; nothing about
    verification_tier changes until an admin reconciles it by hand. */
export async function submitCheckPayment(userId: string): Promise<{ referenceCode: string; instructions: string | null; feeCents: number }> {
  const settings = await getPaymentSettings();
  if (!settings.feeCents) throw new PaymentNotConfigured("no fee set");
  if (!settings.checkPaymentEnabled) throw new Error("Check payment is currently disabled.");
  const code = generateCheckReferenceCode();
  await db().query(
    `INSERT INTO payment_verifications (user_id, method, amount_cents, status, check_reference_code)
     VALUES ($1, 'check', $2, 'pending', $3)`,
    [userId, settings.feeCents, code],
  );
  return { referenceCode: code, instructions: settings.checkInstructions, feeCents: settings.feeCents };
}

export interface PendingCheck {
  id: string;
  user_id: string;
  amount_cents: number;
  check_reference_code: string;
  created_at: string;
}

/** Admin reconciliation queue -- mirrors adminAnomalyQueue()'s shape. */
export async function adminPendingCheckQueue(): Promise<PendingCheck[]> {
  const { rows } = await db().query(
    `SELECT id, user_id, amount_cents, check_reference_code, created_at::date::text AS created_at
       FROM payment_verifications
      WHERE method = 'check' AND status = 'pending'
      ORDER BY created_at ASC`,
  );
  return rows as PendingCheck[];
}

/** Admin marks a mailed check as received and reconciled -- the only way a
    'check' row (or its user) ever reaches payment_verified. adminName is a
    free-text label, not a real per-admin identity -- see the admin-roles
    backlog item for why that's a known, separate gap. */
export async function reconcileCheckPayment(id: string, adminName: string): Promise<void> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE payment_verifications
          SET status = 'succeeded', reconciled_by = $2, reconciled_at = now(), verified_at = now()
        WHERE id = $1 AND method = 'check' AND status = 'pending'
        RETURNING user_id`,
      [id, adminName],
    );
    if (rows[0]) {
      await client.query(`UPDATE users SET verification_tier = 'payment_verified' WHERE id = $1 AND verification_tier != 'payment_verified'`, [
        rows[0].user_id,
      ]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
