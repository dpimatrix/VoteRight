import { randomInt } from "node:crypto";
import { db } from "./db";
import { createStripeIntent, handleStripeWebhook, type StripeCreds } from "./paymentGateways/stripe";
import {
  chargeOpaqueData,
  parseAuthorizeNetWebhook,
  verifyAuthorizeNetSignature,
  type AuthorizeNetCreds,
} from "./paymentGateways/authorizenet";

/* Payment-as-verification (2026-08-19 decision, migration 085). A
   successful card charge or ACH/eCheck transfer -- tied to a real name/bank
   account -- IS the identity signal here, not a document check. No ID
   upload, no KYC vendor. This replaces the never-built govt_id_verified
   tier ARCHITECTURE.md §13 item 9 left open; see that migration's header
   comment for the full reasoning. Whether to ALSO require an ID upload on
   top of this is a separate, still-open decision this file doesn't
   address.

   Multi-gateway (Stripe + Authorize.Net) rather than locked to one vendor
   -- config for BOTH lives in payment_settings at once so switching
   active_gateway doesn't lose the other's credentials; only one is live
   for new charges at a time. */

export type Gateway = "stripe" | "authorizenet";

export interface PaymentSettings {
  feeCents: number | null;
  activeGateway: Gateway | null;
  stripe: StripeCreds | null; // null unless BOTH secret+publishable keys are set
  authorizenet: AuthorizeNetCreds | null; // null unless BOTH api login id + transaction key are set
  authorizenetPublicClientKey: string | null;
  authorizenetSignatureKey: string | null;
  checkPaymentEnabled: boolean;
  checkInstructions: string | null;
  updatedAt: string;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const { rows } = await db().query(
    `SELECT fee_cents, active_gateway,
            stripe_secret_key, stripe_publishable_key, stripe_webhook_secret,
            authorizenet_api_login_id, authorizenet_transaction_key,
            authorizenet_public_client_key, authorizenet_signature_key, authorizenet_environment,
            check_payment_enabled, check_instructions, updated_at
       FROM payment_settings WHERE id = 1`,
  );
  const r = rows[0];
  return {
    feeCents: r.fee_cents,
    activeGateway: r.active_gateway,
    stripe:
      r.stripe_secret_key && r.stripe_publishable_key
        ? { secretKey: r.stripe_secret_key, publishableKey: r.stripe_publishable_key, webhookSecret: r.stripe_webhook_secret }
        : null,
    authorizenet:
      r.authorizenet_api_login_id && r.authorizenet_transaction_key
        ? { apiLoginId: r.authorizenet_api_login_id, transactionKey: r.authorizenet_transaction_key, environment: r.authorizenet_environment }
        : null,
    authorizenetPublicClientKey: r.authorizenet_public_client_key,
    authorizenetSignatureKey: r.authorizenet_signature_key,
    checkPaymentEnabled: r.check_payment_enabled,
    checkInstructions: r.check_instructions,
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
  activeGateway?: Gateway;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  authorizenetApiLoginId?: string;
  authorizenetTransactionKey?: string;
  authorizenetPublicClientKey?: string;
  authorizenetSignatureKey?: string;
  authorizenetEnvironment?: "sandbox" | "production";
  checkPaymentEnabled?: boolean;
  checkInstructions?: string;
}): Promise<void> {
  await db().query(
    `UPDATE payment_settings SET
       fee_cents = COALESCE($1, fee_cents),
       active_gateway = COALESCE($2, active_gateway),
       stripe_secret_key = COALESCE($3, stripe_secret_key),
       stripe_publishable_key = COALESCE($4, stripe_publishable_key),
       stripe_webhook_secret = COALESCE($5, stripe_webhook_secret),
       authorizenet_api_login_id = COALESCE($6, authorizenet_api_login_id),
       authorizenet_transaction_key = COALESCE($7, authorizenet_transaction_key),
       authorizenet_public_client_key = COALESCE($8, authorizenet_public_client_key),
       authorizenet_signature_key = COALESCE($9, authorizenet_signature_key),
       authorizenet_environment = COALESCE($10, authorizenet_environment),
       check_payment_enabled = COALESCE($11, check_payment_enabled),
       check_instructions = COALESCE($12, check_instructions),
       updated_at = now()
     WHERE id = 1`,
    [
      opts.feeCents ?? null,
      opts.activeGateway ?? null,
      opts.stripeSecretKey ?? null,
      opts.stripePublishableKey ?? null,
      opts.stripeWebhookSecret ?? null,
      opts.authorizenetApiLoginId ?? null,
      opts.authorizenetTransactionKey ?? null,
      opts.authorizenetPublicClientKey ?? null,
      opts.authorizenetSignatureKey ?? null,
      opts.authorizenetEnvironment ?? null,
      opts.checkPaymentEnabled ?? null,
      opts.checkInstructions ?? null,
    ],
  );
}

/** $5.00-style display, cents in, dollars-and-cents string out. Pure, unit-tested. */
export function formatFeeCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export class PaymentNotConfigured extends Error {
  constructor(detail: string) {
    super(`Payment verification isn't fully configured yet: ${detail}. Set it up in /admin/payments.`);
  }
}

async function insertPending(userId: string, method: "card" | "ach", gateway: Gateway, amountCents: number): Promise<string> {
  const { rows } = await db().query(
    `INSERT INTO payment_verifications (user_id, method, gateway, amount_cents, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
    [userId, method, gateway, amountCents],
  );
  return rows[0].id as string;
}

/** Starts a card/ACH payment on whichever gateway is currently active.
    Stripe: returns a PaymentIntent client secret for the Payment Element.
    Authorize.Net: returns the public client key + API login id Accept.js
    needs to tokenize in the browser; the actual charge happens via
    chargeAuthorizeNetToken below once the client has that token. */
export async function startCardPayment(
  userId: string,
): Promise<
  | { gateway: "stripe"; recordId: string; feeCents: number; clientSecret: string; publishableKey: string }
  | { gateway: "authorizenet"; recordId: string; feeCents: number; apiLoginId: string; publicClientKey: string; environment: "sandbox" | "production" }
> {
  const settings = await getPaymentSettings();
  if (!settings.feeCents) throw new PaymentNotConfigured("no fee set");
  if (!settings.activeGateway) throw new PaymentNotConfigured("no payment gateway selected");

  if (settings.activeGateway === "stripe") {
    if (!settings.stripe) throw new PaymentNotConfigured("Stripe keys missing");
    const { clientSecret, stripeIntentId } = await createStripeIntent(settings.stripe, { amountCents: settings.feeCents, userId });
    const recordId = await insertPending(userId, "card", "stripe", settings.feeCents);
    await db().query(`UPDATE payment_verifications SET gateway_transaction_id = $1 WHERE id = $2`, [stripeIntentId, recordId]);
    return { gateway: "stripe", recordId, feeCents: settings.feeCents, clientSecret, publishableKey: settings.stripe.publishableKey };
  }

  if (!settings.authorizenet || !settings.authorizenetPublicClientKey) throw new PaymentNotConfigured("Authorize.Net keys missing");
  const recordId = await insertPending(userId, "card", "authorizenet", settings.feeCents);
  return {
    gateway: "authorizenet",
    recordId,
    feeCents: settings.feeCents,
    apiLoginId: settings.authorizenet.apiLoginId,
    publicClientKey: settings.authorizenetPublicClientKey,
    environment: settings.authorizenet.environment,
  };
}

/** Authorize.Net-only: the client has tokenized via Accept.js and posted
    the opaque token here. Unlike Stripe's intent/webhook split, a card
    charge here is authoritative and synchronous -- Authorize.Net's
    createTransactionRequest IS the real-time auth+capture result, so the
    tier promotion happens directly off this response for 'succeeded', not
    deferred to a webhook. (eCheck/ACH-shaped transactions still settle
    over days and come back 'pending' -- those DO rely on the webhook
    handler below for final confirmation, same as Stripe ACH.) */
export async function chargeAuthorizeNetToken(
  recordId: string,
  userId: string,
  dataDescriptor: string,
  dataValue: string,
): Promise<{ status: "succeeded" | "pending" | "failed"; message: string }> {
  const settings = await getPaymentSettings();
  if (!settings.authorizenet) throw new PaymentNotConfigured("Authorize.Net keys missing");
  const record = await db().query(`SELECT amount_cents FROM payment_verifications WHERE id = $1 AND user_id = $2`, [recordId, userId]);
  if (!record.rows[0]) throw new Error("payment record not found");
  const result = await chargeOpaqueData(settings.authorizenet, {
    amountCents: record.rows[0].amount_cents,
    dataDescriptor,
    dataValue,
    userId,
  });
  await promoteFromGatewayResult(recordId, result.transactionId, result.status);
  return { status: result.status, message: result.message };
}

async function promoteFromGatewayResult(recordId: string, gatewayTransactionId: string | null, status: "succeeded" | "pending" | "failed"): Promise<void> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE payment_verifications SET status = $2, gateway_transaction_id = COALESCE($3, gateway_transaction_id),
         verified_at = CASE WHEN $2 = 'succeeded' THEN now() ELSE verified_at END
       WHERE id = $1 RETURNING user_id`,
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

/** Dispatches an incoming webhook to whichever gateway signed it -- tries
    Stripe signature verification first (cheap, throws on mismatch), falls
    back to Authorize.Net. Never trust either body without its signature
    check; that's the only thing standing between this endpoint and anyone
    on the internet minting themselves payment_verified for free. */
export async function handleGatewayWebhook(rawBody: string, headers: { stripeSignature: string | null; authorizenetSignature: string | null }): Promise<void> {
  const settings = await getPaymentSettings();

  if (headers.stripeSignature && settings.stripe?.webhookSecret) {
    const result = handleStripeWebhook(settings.stripe, rawBody, headers.stripeSignature);
    if (result) {
      await db().query(`UPDATE payment_verifications SET method = $2 WHERE gateway = 'stripe' AND gateway_transaction_id = $1`, [
        result.stripeIntentId,
        result.method,
      ]);
      const row = await db().query(`SELECT id FROM payment_verifications WHERE gateway = 'stripe' AND gateway_transaction_id = $1`, [result.stripeIntentId]);
      if (row.rows[0]) await promoteFromGatewayResult(row.rows[0].id, result.stripeIntentId, result.status);
    }
    return;
  }

  if (headers.authorizenetSignature && settings.authorizenetSignatureKey) {
    if (!verifyAuthorizeNetSignature(rawBody, headers.authorizenetSignature, settings.authorizenetSignatureKey)) {
      throw new Error("invalid Authorize.Net webhook signature");
    }
    const event = parseAuthorizeNetWebhook(rawBody);
    if (!event.transactionId) return;
    const status = event.eventType.includes("declined") || event.eventType.includes("failed") ? "failed" : "succeeded";
    const row = await db().query(`SELECT id FROM payment_verifications WHERE gateway = 'authorizenet' AND gateway_transaction_id = $1`, [
      event.transactionId,
    ]);
    if (row.rows[0]) await promoteFromGatewayResult(row.rows[0].id, event.transactionId, status);
    return;
  }

  throw new Error("webhook signature present for no configured gateway");
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
