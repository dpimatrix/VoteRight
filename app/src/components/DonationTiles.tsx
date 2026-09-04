import type { t } from "@/lib/i18n";
import { DONATION_TIERS_CENTS } from "@/lib/donations";

/* Voluntary donation tiles (migration 099, dynamic Stripe Checkout Sessions
   -- see startDonationCheckout's own comment for why this replaced
   admin-pasted Stripe Payment Links). Plain server-rendered <form>s, no
   client JS needed: each POSTs to /api/donate/checkout, which creates a
   fresh Checkout Session for that exact amount and redirects straight to
   Stripe's hosted page -- same "no client JS, form POST + redirect" shape
   as the mail-in check option right below this on /verify/payment.
   Mobile does NOT reuse this component (a plain <a>/<form> has no in-app-
   browser behavior on native); verify-payment.tsx renders its own tiles
   that call the same endpoint over JSON instead. */

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}

export function DonationTiles({ lang, d }: { lang: string; d: ReturnType<typeof t> }) {
  return (
    <div className="card">
      <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.95rem" }}>{d.donate_h}</h3>
      <p className="nopos" style={{ marginTop: 0 }}>{d.donate_p}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
        {DONATION_TIERS_CENTS.map((cents) => (
          <form key={cents} method="post" action="/api/donate/checkout">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="amount_dollars" value={cents / 100} />
            <button className="btn secondary" type="submit">{formatUsd(cents)}</button>
          </form>
        ))}
      </div>
      <form method="post" action="/api/donate/checkout" style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="lang" value={lang} />
        <input
          type="number"
          name="amount_dollars"
          min="0.50"
          step="0.01"
          placeholder={d.donate_more_placeholder}
          style={{ width: "8rem" }}
          required
        />
        <button className="btn secondary" type="submit">{d.donate_more_btn}</button>
      </form>
    </div>
  );
}
