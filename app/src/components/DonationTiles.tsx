import type { t } from "@/lib/i18n";
import type { DonationLinks } from "@/lib/paymentVerification";

/* Voluntary donation tiles (migration 098) -- see that migration's own
   comment for why these are plain links to admin-pasted Stripe Payment
   Links rather than a second in-app checkout. Static server-rendered
   anchors, no client JS needed: Stripe's own hosted page does everything
   from here on, including on mobile where this same component is NOT
   used (verify-payment.tsx renders its own tiles via ExternalLink, since
   a plain <a> has no in-app-browser behavior on native). */

const TIERS: { key: keyof Omit<DonationLinks, "more">; amount: string }[] = [
  { key: "d20", amount: "$20" },
  { key: "d50", amount: "$50" },
  { key: "d100", amount: "$100" },
  { key: "d500", amount: "$500" },
  { key: "d1000", amount: "$1,000" },
];

export function DonationTiles({ links, d }: { links: DonationLinks; d: ReturnType<typeof t> }) {
  const anyConfigured = TIERS.some((tier) => links[tier.key]) || links.more;
  if (!anyConfigured) return null;
  return (
    <div className="card">
      <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.95rem" }}>{d.donate_h}</h3>
      <p className="nopos" style={{ marginTop: 0 }}>{d.donate_p}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
        {TIERS.map(
          (tier) =>
            links[tier.key] && (
              <a key={tier.key} className="btn secondary" href={links[tier.key]!} target="_blank" rel="noopener noreferrer">
                {tier.amount}
              </a>
            ),
        )}
        {links.more && (
          <a className="btn secondary" href={links.more} target="_blank" rel="noopener noreferrer">
            {d.donate_more_btn}
          </a>
        )}
      </div>
    </div>
  );
}
