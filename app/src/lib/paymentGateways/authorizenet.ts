import { createHmac, timingSafeEqual } from "node:crypto";

/* Authorize.Net integration via their JSON API over plain fetch() rather
   than the official `authorizenet` npm SDK -- that SDK is a Java-style,
   callback-based port that's awkward in a modern TS/async codebase, and
   the JSON API itself is simple and well-documented enough not to need it
   (same "don't add a dependency you don't need" call as skipping a real
   fingerprinting SDK for anomalyDetection.ts).

   Card/bank data is tokenized in the BROWSER via Authorize.Net's Accept.js
   (loaded from their own CDN, never bundled) into an opaque
   dataDescriptor/dataValue pair -- VoteRight's server only ever sees that
   opaque token, never a raw card or bank account number. Same PCI-conscious
   posture as the Stripe Elements path.

   NOT YET TESTED against real sandbox credentials -- verify end-to-end
   with a real Authorize.Net sandbox account before this goes live, same
   caveat every new vendor integration in this project carries until a real
   key exists to test against. */

export interface AuthorizeNetCreds {
  apiLoginId: string;
  transactionKey: string;
  environment: "sandbox" | "production";
}

function endpoint(env: "sandbox" | "production"): string {
  return env === "production"
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

export interface AuthorizeNetChargeResult {
  status: "succeeded" | "pending" | "failed";
  transactionId: string | null;
  message: string;
}

/** Charges an Accept.js opaque token (dataDescriptor/dataValue from the
    browser) for the given amount. Returns synchronously -- Authorize.Net's
    createTransactionRequest for a card charge is a real-time auth+capture,
    unlike Stripe's intent/webhook split, so there's no separate
    confirmation step for the card path. eCheck.Net (ACH-equivalent)
    transactions settle over days and report 'pending' here; final
    settlement is confirmed via the webhook handler below, same as Stripe
    ACH. */
export async function chargeOpaqueData(
  creds: AuthorizeNetCreds,
  opts: { amountCents: number; dataDescriptor: string; dataValue: string; userId: string },
): Promise<AuthorizeNetChargeResult> {
  const body = {
    createTransactionRequest: {
      merchantAuthentication: { name: creds.apiLoginId, transactionKey: creds.transactionKey },
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: (opts.amountCents / 100).toFixed(2),
        payment: { opaqueData: { dataDescriptor: opts.dataDescriptor, dataValue: opts.dataValue } },
        userFields: { userField: [{ name: "voteright_user_id", value: opts.userId }] },
      },
    },
  };
  const res = await fetch(endpoint(creds.environment), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    transactionResponse?: { responseCode?: string; transId?: string; messages?: { message?: { description?: string }[] } };
    messages?: { resultCode?: string; message?: { text?: string }[] };
  };
  const txn = json.transactionResponse;
  const transactionId = txn?.transId && txn.transId !== "0" ? txn.transId : null;
  // responseCode: 1 = approved, 2 = declined, 4 = held for review (pending).
  const status: AuthorizeNetChargeResult["status"] =
    txn?.responseCode === "1" ? "succeeded" : txn?.responseCode === "4" ? "pending" : "failed";
  const message =
    txn?.messages?.message?.[0]?.description ?? json.messages?.message?.[0]?.text ?? "Unknown response from Authorize.Net";
  return { status, transactionId, message };
}

/** Authorize.Net signs webhook payloads with HMAC-SHA512 over the raw body,
    delivered in the X-ANET-Signature header as "sha512=<hex>". */
export function verifyAuthorizeNetSignature(rawBody: string, signatureHeader: string | null, signatureKey: string): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.replace(/^sha512=/i, "").toLowerCase();
  const expected = createHmac("sha512", Buffer.from(signatureKey, "hex")).update(rawBody).digest("hex").toLowerCase();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface AuthorizeNetWebhookEvent {
  eventType: string;
  transactionId: string | null;
}

export function parseAuthorizeNetWebhook(rawBody: string): AuthorizeNetWebhookEvent {
  const json = JSON.parse(rawBody) as { eventType?: string; payload?: { id?: string } };
  return { eventType: json.eventType ?? "", transactionId: json.payload?.id ?? null };
}
