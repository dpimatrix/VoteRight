import Link from "next/link";
import { AxisDots } from "@/components/AxisDots";
import { Chev } from "@/components/Chev";
import { PolAvatar } from "@/components/PolAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t, tf } from "@/lib/i18n";
import { ownRaceIds } from "@/lib/jurisdictions";
import { matchesForRace } from "@/lib/matches";
import { isSampleData, races } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Overall-band chip (strong/good/mixed/weak/insufficient) -- distinct from
// scoreLabels.ts's BAND_CLASS, which maps a single axis's -2..2 agreement
// value, not this aggregate band.
const OVERALL_BAND_CLASS = { strong: "b2", good: "b1", mixed: "b0", weak: "bm1", insufficient: "bnull" } as const;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; race?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  // Scope the race picker to what's actually on this resident's own ballot
  // (same narrowing the Ballot page/API apply) instead of every race in the
  // system — null when residence is unknown, which shows everything, same
  // as before. See ownRaceIds's doc comment.
  const ownIds = await ownRaceIds(userId);
  const allRacesRaw = await races();
  const allRaces = ownIds ? allRacesRaw.filter((r) => ownIds.has(r.id)) : allRacesRaw;
  const sample = await isSampleData();
  const raceId = sp.race ?? allRaces[0]?.id;
  const race = allRaces.find((r) => r.id === raceId);

  const data = userId && raceId ? await matchesForRace(raceId, userId) : null;
  const hasPriorities = (data?.priorities.length ?? 0) >= 3;

  return (
    <>
      <SiteHeader lang={lang} path={`/matches?race=${raceId ?? ""}`} />
      <div className="pagepad">
        <div className="pagetitle">{d.matches_h}</div>
        <p className="sub">{d.matches_p}</p>
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
        {race && (
          <p className="sub">
            {race.seats_elected > 1 ? tf(d.seats_multi, { n: race.seats_elected }) : d.open_seat}
          </p>
        )}
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
                  <PolAvatar name={r.fullName} photoUrl={r.photoUrl} />
                  <span className="body">
                    <span className="row1">
                      <span className="cname">{r.fullName}</span>
                      <span className="cparty">({r.party ?? d.nonpartisan})</span>
                      {r.incumbent && <span className="inc">{d.incumbent}</span>}
                    </span>
                    <span className="row2">
                      <span className={`chip band ${OVERALL_BAND_CLASS[r.score.overall]}`}>
                        {d.ov[r.score.overall]}
                      </span>
                    </span>
                    {r.score.dealbreaker && (
                      <span className="row2">
                        <span className="chip band bm1">⚠ {d.deal}</span>
                      </span>
                    )}
                    <AxisDots
                      priorities={data!.priorities}
                      perAxis={r.score.perAxis}
                      evidence={r.evidence}
                      d={d}
                      lang={lang}
                    />
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
