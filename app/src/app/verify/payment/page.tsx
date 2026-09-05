import { BackupPrompt } from "@/components/BackupPrompt";
import { DonationTiles } from "@/components/DonationTiles";
import { PaymentCheckout } from "@/components/PaymentCheckout";
import { PaymentConfirming } from "@/components/PaymentConfirming";
import { SiteHeader } from "@/components/SiteHeader";
import { verifiedUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";
import { formatFeeCents, getPaymentSettings } from "@/lib/paymentVerification";

export const dynamic = "force-dynamic";

export default async function PaymentVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; checkCode?: string; submitted?: string; donated?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await verifiedUserId();

  return (
    <>
      <SiteHeader lang={lang} path="/verify/payment" />
      <div className="pagepad">
        <div className="pagetitle">{d.pay_h}</div>
        <p style={{ fontSize: "0.92rem" }}>{d.pay_p}</p>

        {!userId ? (
          <p className="nopos">{d.verify_need}</p>
        ) : (
          await (async () => {
            const tier = await userTier(userId);
            // Moved above the tier branch (was previously only fetched in
            // the not-yet-verified path below) so the payment_verified
            // branch can read settings.stripe too -- one settings row, one
            // query, regardless of which branch needs it.
            const settings = await getPaymentSettings();
            if (tier === "payment_verified")
              return (
                <>
                  <p className="pill kept">{d.pay_success}</p>
                  {sp.donated === "1" && <p className="pill kept">{d.donate_thanks}</p>}
                  {sp.error && <p className="nopos">{d.donate_error}</p>}
                  {settings.stripe && <DonationTiles lang={lang} d={d} />}
                  <BackupPrompt lang={lang} d={d} />
                </>
              );

            // Real bug found live testing 2026-09-03: Stripe's confirmPayment()
            // redirects back here (?submitted=1) the instant the CHARGE
            // succeeds -- our own payment_verified promotion happens off a
            // separate, asynchronous webhook that can take a few seconds
            // longer. Landing here before it lands used to just re-render
            // the untouched pay form below, as if the charge never
            // happened. See PaymentConfirming's own comment for how this
            // resolves itself once the webhook catches up.
            if (sp.submitted === "1") return <PaymentConfirming label={d.pay_confirming} stillLabel={d.pay_confirming_slow} />;

            const configured = Boolean(settings.feeCents && settings.stripe);
            if (!configured) return <p className="nopos">{d.pay_not_configured}</p>;

            if (sp.checkCode) {
              return (
                <div className="card">
                  <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>{d.pay_check_code_h}</h3>
                  <p className="mono" style={{ fontSize: "1.3rem", fontWeight: 800 }}>{sp.checkCode}</p>
                  <p className="nopos">{d.pay_check_code_note}</p>
                  {settings.checkInstructions && <p style={{ fontSize: "0.88rem", whiteSpace: "pre-wrap" }}>{settings.checkInstructions}</p>}
                </div>
              );
            }

            return (
              <>
                <div className="card">
                  <p className="cover" style={{ marginTop: 0 }}>
                    {d.pay_fee_label}: {formatFeeCents(settings.feeCents!)}
                  </p>
                  <PaymentCheckout
                    lang={lang}
                    labels={{
                      fee: formatFeeCents(settings.feeCents!),
                      startBtn: d.pay_start_btn,
                      checkBtn: d.pay_check_btn,
                      processing: d.pay_processing,
                      error: d.pay_error,
                      checkInstructionsLabel: d.pay_check_h,
                    }}
                  />
                </div>
                {settings.checkPaymentEnabled && (
                  <div className="card">
                    <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>{d.pay_check_h}</h3>
                    <form method="post" action="/api/payment-verification/check">
                      <input type="hidden" name="lang" value={lang} />
                      <button className="btn secondary" type="submit">{d.pay_check_btn}</button>
                    </form>
                  </div>
                )}
              </>
            );
          })()
        )}
      </div>
    </>
  );
}
