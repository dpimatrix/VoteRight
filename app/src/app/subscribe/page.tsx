import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { currentTier, getSubscriptionPlans } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; subscribed?: string; error?: string; newApiKey?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const plans = await getSubscriptionPlans();
  const tier = userId ? await currentTier(userId) : "none";

  return (
    <>
      <SiteHeader lang={lang} path="/subscribe" />
      <div className="pagepad">
        <div className="pagetitle">{d.sub_h}</div>
        <p style={{ fontSize: "0.92rem" }}>{d.sub_p}</p>
        {sp.error === "not_configured" && <p className="nopos">{d.sub_not_configured}</p>}

        {sp.newApiKey && (
          <div className="disclosure">
            <span className="tag">{d.sub_apikey_shown_h}</span>
            <span>
              {d.sub_apikey_shown_note}
              <br />
              <code className="mono" style={{ wordBreak: "break-all", display: "block", marginTop: "0.4rem" }}>{sp.newApiKey}</code>
            </span>
          </div>
        )}

        {tier !== "none" ? (
          <div className="card">
            <p className="pill kept">
              {d.sub_current} {plans.find((p) => p.tier === tier)?.displayName ?? tier}
            </p>
            <form method="post" action="/api/subscriptions/portal" style={{ marginTop: "0.5rem" }}>
              <input type="hidden" name="lang" value={lang} />
              <button className="btn secondary" type="submit">{d.sub_manage_btn}</button>
            </form>
          </div>
        ) : (
          plans.map((p) => (
            <div className="card" key={p.tier}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                <strong style={{ flex: 1 }}>{p.displayName}</strong>
                {p.priceDisplay && <span className="cover">{p.priceDisplay}</span>}
              </div>
              <form method="post" action="/api/subscriptions/checkout" style={{ marginTop: "0.5rem" }}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="tier" value={p.tier} />
                <button className="btn" type="submit" disabled={!p.stripePriceId}>{d.sub_subscribe_btn}</button>
              </form>
            </div>
          ))
        )}

        {(tier === "supporter" || tier === "patron" || tier === "champion") && (
          <div className="card">
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>{d.sub_export_h}</h3>
            <a className="btn secondary" href="/api/subscriptions/export/priorities">{d.sub_export_btn}</a>
          </div>
        )}

        {tier === "champion" && (
          <div className="card">
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>{d.sub_apikey_h}</h3>
            <p className="nopos">{d.sub_apikey_p}</p>
            <form method="post" action="/api/subscriptions/api-key">
              <input type="hidden" name="lang" value={lang} />
              <button className="btn secondary" type="submit">{d.sub_apikey_btn}</button>
            </form>
            <p className="nopos" style={{ marginTop: "0.4rem" }}>{d.sub_apikey_regenerate_note}</p>
          </div>
        )}
      </div>
    </>
  );
}
