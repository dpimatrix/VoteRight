import Link from "next/link";
import { MatchResultsList } from "@/components/MatchResultsList";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t, tf } from "@/lib/i18n";
import { ownRaceIds } from "@/lib/jurisdictions";
import { matchesForRace } from "@/lib/matches";
import { isSampleData, races } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
          <MatchResultsList
            results={data!.results}
            priorities={data!.priorities}
            d={d}
            lang={lang}
            raceId={raceId!}
          />
        )}
      </div>
    </>
  );
}
