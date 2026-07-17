import Link from "next/link";
import { Chev } from "@/components/Chev";
import { SiteHeader } from "@/components/SiteHeader";
import { langFrom, t } from "@/lib/i18n";
import { ballot } from "@/lib/queries";

export const dynamic = "force-dynamic";

const GROUPS: { level: string; en: string; es: string }[] = [
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
  return title.slice(0, 2).toUpperCase();
}

export default async function BallotPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const offices = await ballot();

  return (
    <>
      <SiteHeader lang={lang} path="/" />
      <div className="hero">
        <h1>{d.ballot_h}</h1>
        <p>{d.tagline}</p>
      </div>
      <div className="pagepad">
        {GROUPS.map((g) => {
          const rows = offices.filter((o) => o.level === g.level);
          if (rows.length === 0) return null;
          return (
            <section key={g.level}>
              <div className="grouph">{g[lang]}</div>
              {rows.map((o) => {
                const tracked = o.race_id !== null;
                const meta =
                  d.on_ballot +
                  (o.seat_count > 1
                    ? ` · ${o.seat_count} ${lang === "es" ? "escaños" : "seats"}`
                    : "");
                const icon = <span className="seat-ic">{officeCode(o.title)}</span>;
                if (o.level === "judicial") {
                  return (
                    <div key={o.id} className="seat wrap">
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
                    <div key={o.id} className="seat">
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
                  <Link
                    key={o.id}
                    className="seat"
                    href={`/matches?race=${o.race_id}&lang=${lang}`}
                  >
                    {icon}
                    <span className="sname">
                      {o.title}
                      <span className="smeta">{meta}</span>
                    </span>
                    <span className="chip band b2">{d.tracked}</span>
                    <Chev />
                  </Link>
                );
              })}
            </section>
          );
        })}
        <p className="nopos">{d.ballot_note}</p>
        <Link className="btn" href={`/priorities?lang=${lang}`}>
          {d.set_prios}
        </Link>
      </div>
    </>
  );
}
