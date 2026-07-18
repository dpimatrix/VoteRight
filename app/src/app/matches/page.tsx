import Link from "next/link";
import { Chev } from "@/components/Chev";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { matchesForRace } from "@/lib/matches";
import { isSampleData, races } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BAND_CLASS = { strong: "b2", good: "b1", mixed: "b0", weak: "bm1", insufficient: "bnull" } as const;
const DOT = (a: number | null) =>
  a === null ? "dnull" : ({ 2: "d2", 1: "d1", 0: "d0", "-1": "dm1", "-2": "dm2" } as Record<string, string>)[String(a)];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; race?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const allRaces = await races();
  const sample = await isSampleData();
  const raceId = sp.race ?? allRaces[0]?.id;
  const race = allRaces.find((r) => r.id === raceId);

  const userId = await currentUserId();
  const data = userId && raceId ? await matchesForRace(raceId, userId) : null;
  const hasPriorities = (data?.priorities.length ?? 0) >= 3;

  return (
    <>
      <SiteHeader lang={lang} path={`/matches?race=${raceId ?? ""}`} />
      <div className="pagepad">
        <div className="pagetitle">{d.matches_h}</div>
        <div className="seg">
          {allRaces.map((r) => (
            <Link
              key={r.id}
              className={r.id === raceId ? "on" : ""}
              href={`/matches?race=${r.id}&lang=${lang}`}
            >
              {r.title.replace("County Council — ", lang === "es" ? "Concejo — " : "Council — ")}
            </Link>
          ))}
        </div>
        {race && <p className="sub">{race.seats_elected > 1 ? d.seats4 : d.open_seat}</p>}
        <div className="disclosure">
          <span className="tag">{sample ? (lang === "es" ? "Muestra" : "Sample") : lang === "es" ? "Datos" : "Data"}</span>
          <span>{sample ? d.sample : d.realdata_note}</span>
        </div>

        {!hasPriorities ? (
          <>
            <p className="nopos">{d.need_more}</p>
            <Link className="btn" href={`/priorities?race=${raceId}&lang=${lang}`}>
              {d.set_prios}
            </Link>
          </>
        ) : (
          <>
            {data!.results.map((r) => {
              const insuff = r.score.overall === "insufficient";
              return (
                <Link
                  key={r.politicianId}
                  className={`cand ${insuff ? "insuff" : ""} ${r.score.dealbreaker ? "deal" : ""}`}
                  href={`/candidates/${r.politicianId}?lang=${lang}`}
                >
                  <span className="mono-av" aria-hidden>
                    {initials(r.fullName)}
                  </span>
                  <span className="body">
                    <span className="row1">
                      <span className="cname">{r.fullName}</span>
                      <span className="cparty">({r.party})</span>
                      {r.incumbent && <span className="inc">{d.incumbent}</span>}
                    </span>
                    <span className="row2">
                      <span className={`chip band ${BAND_CLASS[r.score.overall]}`}>
                        {d.ov[r.score.overall]}
                      </span>
                      <span className="dots" aria-hidden>
                        {data!.priorities.map((p) => (
                          <i key={p.axisId} className={DOT(r.score.perAxis[p.axisId]?.agreement ?? null)} />
                        ))}
                      </span>
                    </span>
                    {r.score.dealbreaker && (
                      <span className="row2">
                        <span className="chip band bm1">⚠ {d.deal}</span>
                      </span>
                    )}
                    <span className="covbar" aria-hidden>
                      <i style={{ width: `${Math.round(r.score.coverage * 100)}%` }} />
                    </span>
                    <span className="cover">
                      {d.based_on} {r.score.answered}/{r.score.total} {d.of_your}
                    </span>
                    {insuff && <span className="nopos" style={{ display: "block" }}>{d.insuff_note}</span>}
                  </span>
                  <Chev />
                </Link>
              );
            })}
            <p className="nopos">
              {d.method}{" "}
              <span className="chip cite">▣ {data!.results[0]?.score.algorithmVersion}</span>
            </p>
          </>
        )}
      </div>
    </>
  );
}
