import Link from "next/link";
import { CompareAxisRow } from "@/components/CompareAxisRow";
import { PolAvatar } from "@/components/PolAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { matchesForRace } from "@/lib/matches";

export const dynamic = "force-dynamic";

// Same overall-band mapping as matches/page.tsx and MatchResultsList.tsx --
// kept local rather than shared since it's three lines and importing it
// across three files would cost more than it saves.
const OVERALL_BAND_CLASS = { strong: "b2", good: "b1", mixed: "b0", weak: "bm1", insufficient: "bnull" } as const;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; race?: string; a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();

  const raceId = sp.race;
  const data = userId && raceId ? await matchesForRace(raceId, userId) : null;
  const a = data?.results.find((r) => r.politicianId === sp.a);
  const b = data?.results.find((r) => r.politicianId === sp.b);

  return (
    <>
      <SiteHeader lang={lang} path={`/compare?race=${raceId ?? ""}&a=${sp.a ?? ""}&b=${sp.b ?? ""}`} />
      <div className="pagepad">
        <Link className="nopos" href={`/matches?race=${raceId ?? ""}&lang=${lang}`}>
          {d.compare_back}
        </Link>
        <div className="pagetitle">{d.compare_h}</div>

        {!data || !a || !b ? (
          <p className="nopos">{d.compare_not_found}</p>
        ) : (
          <>
            <div className="comparehead">
              {[a, b].map((r) => (
                <div className="comparecand" key={r.politicianId}>
                  <PolAvatar name={r.fullName} photoUrl={r.photoUrl} size={56} />
                  <span className="cname">{r.fullName}</span>
                  <span className="cparty">({r.party ?? d.nonpartisan})</span>
                  {r.incumbent && <span className="inc">{d.incumbent}</span>}
                  <span className={`chip band ${OVERALL_BAND_CLASS[r.score.overall]}`}>
                    {d.ov[r.score.overall]}
                  </span>
                </div>
              ))}
            </div>

            {data.priorities.map((p) => (
              <CompareAxisRow key={p.axisId} priority={p} a={a} b={b} d={d} lang={lang} />
            ))}

            <p className="nopos">
              {d.method} <span className="chip cite">▣ {a.score.algorithmVersion}</span>
            </p>
          </>
        )}
      </div>
    </>
  );
}
