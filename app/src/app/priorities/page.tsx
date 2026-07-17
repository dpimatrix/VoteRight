import { PriorityForm } from "@/components/PriorityForm";
import { SiteHeader } from "@/components/SiteHeader";
import { langFrom, t } from "@/lib/i18n";
import { races, topicsWithAxes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PrioritiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; race?: string }>;
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
      </div>
    </>
  );
}
