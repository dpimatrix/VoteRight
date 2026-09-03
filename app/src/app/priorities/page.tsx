import { PriorityForm } from "@/components/PriorityForm";
import { SiteHeader } from "@/components/SiteHeader";
import { langFrom, t } from "@/lib/i18n";
import { races, topicsWithAxes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PrioritiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; race?: string; wishSent?: string; wishError?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const topics = await topicsWithAxes();
  const allRaces = await races();
  const defaultRace = sp.race ?? allRaces[0]?.id ?? "";

  return (
    <>
      <SiteHeader lang={lang} path={`/priorities`} />
      <div className="pagepad">
      <div className="pagetitle">{d.prio_h}</div>
      <PriorityForm
        topics={topics}
        lang={lang}
        defaultRace={defaultRace}
        d={{
          prio_p: d.prio_p,
          prio_priv: d.prio_priv,
          weight: d.weight,
          see_matches: d.see_matches,
          need_more: d.need_more,
        }}
      />

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.02rem" }}>{d.priority_wish_h}</div>
        <p className="nopos" style={{ margin: "0.35rem 0" }}>{d.priority_wish_sub}</p>
        {sp.wishSent === "1" && <p className="pill kept" style={{ display: "inline-block", margin: "0 0 0.5rem" }}>{d.priority_wish_sent}</p>}
        {sp.wishError && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{d.priority_wish_error}</p>}
        <form method="post" action="/api/priority-wishes" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input type="hidden" name="lang" value={lang} />
          <textarea name="statement" rows={2} placeholder={d.priority_wish_ph} required style={{ flex: 1, minWidth: 240 }} />
          <button className="btn" type="submit">{d.priority_wish_submit}</button>
        </form>
      </div>
      </div>
    </>
  );
}
