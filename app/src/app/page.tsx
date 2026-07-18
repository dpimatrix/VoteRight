import Link from "next/link";
import { Chev } from "@/components/Chev";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { ballotForJurisdiction, COUNTY, userResidence, type StackedOffice } from "@/lib/jurisdictions";

export const dynamic = "force-dynamic";

const COUNTY_LEVELS: { level: string; en: string; es: string }[] = [
  { level: "county", en: "Montgomery County", es: "Condado de Montgomery" },
  { level: "school_board", en: "School board", es: "Junta escolar" },
  { level: "judicial", en: "Judicial", es: "Judicial" },
];

function officeCode(title: string): string {
  if (title.includes("At-Large")) return "AL";
  if (title.includes("District")) return "D" + (title.match(/District (\d+)/)?.[1] ?? "");
  if (title.includes("Executive")) return "CE";
  if (title.includes("Sheriff")) return "SH";
  if (title.includes("Attorney")) return "SA";
  if (title.includes("Clerk")) return "CL";
  if (title.includes("Register")) return "RW";
  if (title.includes("Education")) return "BE";
  if (title.includes("Judges")) return "CJ";
  if (title.includes("Mayor")) return "MY";
  if (title.includes("City Council")) return "CC";
  return title.slice(0, 2).toUpperCase();
}

function SeatRow({ o, lang, d }: { o: StackedOffice; lang: "en" | "es"; d: ReturnType<typeof t> }) {
  const tracked = o.race_id !== null;
  // Municipal seats without a race genuinely aren't up in 2026 (odd-year city
  // elections); county seats without a race are on the ballot, just untracked.
  const meta =
    (tracked || o.level !== "municipal" ? d.on_ballot : d.no_race_this_cycle) +
    (o.seat_count > 1 ? ` · ${o.seat_count} ${lang === "es" ? "escaños" : "seats"}` : "");
  const icon = <span className="seat-ic">{officeCode(o.title)}</span>;
  if (o.level === "judicial") {
    return (
      <div className="seat wrap">
        {icon}
        <span className="sname">
          {o.title}
          <span className="smeta">{meta}</span>
        </span>
        <span className="chip band bnull">⚖ {d.judicial}</span>
        <span className="snote">{d.jud_note}</span>
      </div>
    );
  }
  if (!tracked) {
    return (
      <div className="seat">
        {icon}
        <span className="sname">
          {o.title}
          <span className="smeta">{meta}</span>
        </span>
        <span className="chip band bnull">{d.later}</span>
      </div>
    );
  }
  return (
    <Link className="seat" href={`/matches?race=${o.race_id}&lang=${lang}`}>
      {icon}
      <span className="sname">
        {o.title}
        <span className="smeta">{meta}</span>
      </span>
      <span className="chip band b2">{d.tracked}</span>
      <Chev />
    </Link>
  );
}

export default async function BallotPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const userId = await currentUserId();
  const residence = (userId && (await userResidence(userId))) || null;
  const residenceId = residence?.ocd_id ?? COUNTY;
  const offices = await ballotForJurisdiction(residenceId);

  // Jurisdictions in stack order (deepest first), from the rows themselves.
  const jurisdictions: { id: string; name: string }[] = [];
  for (const o of offices) {
    if (!jurisdictions.some((j) => j.id === o.jurisdiction_id)) {
      jurisdictions.push({ id: o.jurisdiction_id, name: o.jurisdiction_name });
    }
  }

  return (
    <>
      <SiteHeader lang={lang} path="/" />
      <div className="hero">
        <h1>{d.ballot_h}</h1>
        <p>{d.tagline}</p>
      </div>
      <div className="pagepad">
        {jurisdictions.length > 1 && (
          <p className="nopos" style={{ marginTop: "0.7rem" }}>
            {d.ballot_stack}: {jurisdictions.map((j) => j.name).join(" → ")}
          </p>
        )}
        {jurisdictions.map((j) => {
          const rows = offices.filter((o) => o.jurisdiction_id === j.id);
          if (j.id === COUNTY) {
            // County keeps its level sub-groups (county / school board / judicial).
            return COUNTY_LEVELS.map((g) => {
              const lv = rows.filter((o) => o.level === g.level);
              if (lv.length === 0) return null;
              return (
                <section key={g.level}>
                  <div className="grouph">{g[lang]}</div>
                  {lv.map((o) => (
                    <SeatRow key={o.id} o={o} lang={lang} d={d} />
                  ))}
                </section>
              );
            });
          }
          return (
            <section key={j.id}>
              <div className="grouph">{j.name}</div>
              {rows.map((o) => (
                <SeatRow key={o.id} o={o} lang={lang} d={d} />
              ))}
            </section>
          );
        })}
        <p className="nopos">{d.ballot_note}</p>
        <p className="nopos">{d.ballot_addr_note}</p>
        <Link className="btn" href={`/priorities?lang=${lang}`}>
          {d.set_prios}
        </Link>
      </div>
    </>
  );
}
