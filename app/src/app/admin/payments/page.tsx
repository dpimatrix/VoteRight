import { isAdmin } from "@/lib/adminAuth";
import { adminPendingCheckQueue, formatFeeCents, getPaymentSettings } from "@/lib/paymentVerification";

export const dynamic = "force-dynamic";

function mask(key: string | null): string {
  if (!key) return "";
  return key.length <= 8 ? "•".repeat(key.length) : `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

export default async function PaymentSettingsPage() {
  if (!(await isAdmin())) return null;
  const settings = await getPaymentSettings();
  const queue = await adminPendingCheckQueue();
  const ready =
    settings.feeCents && settings.activeGateway && ((settings.activeGateway === "stripe" && settings.stripe) || (settings.activeGateway === "authorizenet" && settings.authorizenet));

  return (
    <>
      <div className="pagetitle">Payment verification</div>
      <p className="sub">
        Payment-as-identity (2026-08-19): a successful card/ACH charge or a reconciled check is what promotes a
        resident to <code>payment_verified</code> — replacing the never-built govt_id_verified tier. Debate
        participation (second/argue/agree/call-the-question) requires this tier; referenda and accountability
        campaigns are unaffected and still gate on address verification alone.
      </p>

      <div className="card">
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Fee &amp; active gateway</h3>
        {!ready ? (
          <p className="nopos" style={{ marginTop: 0 }}>
            Not fully configured yet — checkout refuses to run until a fee is set, a gateway is chosen below, and
            that gateway's keys are filled in.
          </p>
        ) : (
          <p className="cover" style={{ marginTop: 0 }}>
            Fee: {formatFeeCents(settings.feeCents!)} · active gateway: {settings.activeGateway}
          </p>
        )}
        <form className="admform" method="post" action="/api/admin/payment-settings" style={{ display: "block" }}>
          <input type="hidden" name="section" value="general" />
          <label className="nopos" style={{ display: "block", margin: "0.5rem 0 0.15rem" }}>Fee (USD)</label>
          <input
            type="number" name="fee_dollars" step="0.01" min="0"
            defaultValue={settings.feeCents ? (settings.feeCents / 100).toFixed(2) : ""}
            placeholder="5.00" style={{ width: "100%" }}
          />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>Active gateway</label>
          <select name="active_gateway" defaultValue={settings.activeGateway ?? ""} style={{ width: "100%" }}>
            <option value="" disabled>Choose one…</option>
            <option value="stripe">Stripe</option>
            <option value="authorizenet">Authorize.Net</option>
          </select>
          <button className="btn" type="submit" style={{ marginTop: "0.6rem" }}>Save</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Stripe</h3>
        <form className="admform" method="post" action="/api/admin/payment-settings" style={{ display: "block" }}>
          <input type="hidden" name="section" value="stripe" />
          <label className="nopos" style={{ display: "block", margin: "0.15rem 0" }}>
            Secret key {settings.stripe && <span className="mono">(currently {mask(settings.stripe.secretKey)})</span>}
          </label>
          <input type="password" name="stripe_secret_key" placeholder="sk_live_… (leave blank to keep current)" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Publishable key {settings.stripe && <span className="mono">(currently {mask(settings.stripe.publishableKey)})</span>}
          </label>
          <input type="text" name="stripe_publishable_key" placeholder="pk_live_… (leave blank to keep current)" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Webhook signing secret {settings.stripe?.webhookSecret && <span className="mono">(currently {mask(settings.stripe.webhookSecret)})</span>}
          </label>
          <input type="password" name="stripe_webhook_secret" placeholder="whsec_… (leave blank to keep current)" style={{ width: "100%" }} />
          <p className="nopos" style={{ margin: "0.4rem 0" }}>
            Dashboard → Developers → Webhooks, endpoint <code>/api/payment-verification/webhook</code>, events{" "}
            <code>payment_intent.succeeded</code>, <code>payment_intent.processing</code>,{" "}
            <code>payment_intent.payment_failed</code>.
          </p>
          <button className="btn" type="submit" style={{ marginTop: "0.5rem" }}>Save Stripe keys</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Authorize.Net</h3>
        <form className="admform" method="post" action="/api/admin/payment-settings" style={{ display: "block" }}>
          <input type="hidden" name="section" value="authorizenet" />
          <label className="nopos" style={{ display: "block", margin: "0.15rem 0" }}>
            API Login ID {settings.authorizenet && <span className="mono">(currently {mask(settings.authorizenet.apiLoginId)})</span>}
          </label>
          <input type="text" name="authorizenet_api_login_id" placeholder="leave blank to keep current" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Transaction Key {settings.authorizenet && <span className="mono">(currently {mask(settings.authorizenet.transactionKey)})</span>}
          </label>
          <input type="password" name="authorizenet_transaction_key" placeholder="leave blank to keep current" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Public Client Key (for Accept.js) {settings.authorizenetPublicClientKey && <span className="mono">(currently {mask(settings.authorizenetPublicClientKey)})</span>}
          </label>
          <input type="text" name="authorizenet_public_client_key" placeholder="leave blank to keep current" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Signature Key (webhooks) {settings.authorizenetSignatureKey && <span className="mono">(currently {mask(settings.authorizenetSignatureKey)})</span>}
          </label>
          <input type="password" name="authorizenet_signature_key" placeholder="leave blank to keep current" style={{ width: "100%" }} />
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>Environment</label>
          <select name="authorizenet_environment" defaultValue={settings.authorizenet?.environment ?? "sandbox"} style={{ width: "100%" }}>
            <option value="sandbox">Sandbox (testing)</option>
            <option value="production">Production</option>
          </select>
          <p className="nopos" style={{ margin: "0.4rem 0" }}>
            Account → Settings → Webhooks, endpoint <code>/api/payment-verification/webhook</code>.
          </p>
          <button className="btn" type="submit" style={{ marginTop: "0.5rem" }}>Save Authorize.Net keys</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>Check payment</h3>
        <form className="admform" method="post" action="/api/admin/payment-settings" style={{ display: "block" }}>
          <input type="hidden" name="section" value="check" />
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem" }}>
            <input type="checkbox" name="check_payment_enabled" defaultChecked={settings.checkPaymentEnabled} />
            Accept payment by mailed check
          </label>
          <label className="nopos" style={{ display: "block", margin: "0.6rem 0 0.15rem" }}>
            Instructions shown to the user (mailing address, what to write on the check)
          </label>
          <textarea name="check_instructions" defaultValue={settings.checkInstructions ?? ""} rows={4} style={{ width: "100%" }} />
          <button className="btn" type="submit" style={{ marginTop: "0.5rem" }}>Save</button>
        </form>
      </div>

      <div className="grouph" style={{ marginTop: "1.2rem" }}>Pending checks — reconcile by hand</div>
      {queue.length === 0 && <p className="nopos">No checks awaiting reconciliation.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong className="mono" style={{ flex: 1 }}>{q.check_reference_code}</strong>
            <span className="cover">{formatFeeCents(q.amount_cents)}</span>
            <span className="cover">{q.created_at}</span>
          </div>
          <form method="post" action={`/api/admin/payment-verifications/${q.id}`} style={{ marginTop: "0.5rem" }}>
            <button className="btn" type="submit">Mark check received &amp; verify</button>
          </form>
        </div>
      ))}
    </>
  );
}
