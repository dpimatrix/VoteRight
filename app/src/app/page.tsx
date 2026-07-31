import { cookies } from "next/headers";
import Link from "next/link";
import { Chev } from "@/components/Chev";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import {
  ballotForJurisdiction,
  listBrowsableJurisdictions,
  userResidence,
  type StackedOffice,
} from "@/lib/jurisdictions";

export const dynamic = "force-dynamic";

// Some jurisdictions elect their school board and judiciary separately from
// general county government — where seeded offices carry those levels, they get
// their own sub-heading instead of one flat list. Not every jurisdiction has all
// three (a jurisdiction with no judicial-level offices just skips that group).
const SUB_GROUP_LEVELS = ["county", "school_board", "judicial"] as const;
const SUB_GROUP_LABELS: Record<(typeof SUB_GROUP_LEVELS)[number], { en: string; es: string } | null> = {
  county: null, // uses the jurisdiction's own name instead of a fixed label
  school_board: { en: "School board", es: "Junta escolar" },
  judicial: { en: "Judicial", es: "Judicial" },
};

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
  // No default jurisdiction — a not-yet-verified user's residence is genuinely
  // unknown nationwide (see ensureUser in queries.ts). Visitor mode below still
  // works without one; only "your ballot" needs a real, verified residence.
  const residenceId = residence?.ocd_id ?? null;

  // Visitor mode: a display-only lens. Participation rights always follow
  // users.residence_jurisdiction_id in the database, never this cookie.
  const browsable = await listBrowsableJurisdictions();
  const visitCookie = (await cookies()).get("vr_visit")?.value;
  const visited = browsable.find((j) => j.ocd_id === visitCookie && j.ocd_id !== residenceId) ?? null;
  const displayId = visited ? visited.ocd_id : residenceId;

  const offices = displayId ? await ballotForJurisdiction(displayId) : [];

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
        {!displayId && (
          <div className="disclosure" style={{ marginTop: "0.7rem" }}>
            <span>{d.ballot_no_residence}</span>
            <Link className="btn" href={`/verify?lang=${lang}`} style={{ marginTop: "0.5rem" }}>
              {d.verify_btn}
            </Link>
          </div>
        )}
        {visited && (
          <div className="disclosure" style={{ marginTop: "0.7rem" }}>
            <span className="tag">{lang === "es" ? "Visitante" : "Visitor"}</span>
            <span>
              {d.visit_note.replace("%s", visited.name)}{" "}
            </span>
            <form method="post" action="/api/visit" style={{ display: "inline" }}>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="jurisdiction" value="" />
              <button className="btn secondary" type="submit" style={{ marginTop: "0.4rem" }}>
                {d.visit_return}
              </button>
            </form>
          </div>
        )}
        {!visited && jurisdictions.length > 1 && (
          <p className="nopos" style={{ marginTop: "0.7rem" }}>
            {d.ballot_stack}: {jurisdictions.map((j) => j.name).join(" → ")}
          </p>
        )}
        {jurisdictions.map((j) => {
          const rows = offices.filter((o) => o.jurisdiction_id === j.id);
          const hasSubGroups = rows.some((o) => (SUB_GROUP_LEVELS as readonly string[]).includes(o.level));
          if (hasSubGroups) {
            return SUB_GROUP_LEVELS.map((level) => {
              const lv = rows.filter((o) => o.level === level);
              if (lv.length === 0) return null;
              const label = SUB_GROUP_LABELS[level];
              return (
                <section key={level}>
                  <div className="grouph">{label ? label[lang] : j.name}</div>
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
        {offices.some((o) => o.title.includes("District")) && (
          <p className="nopos">{d.ballot_districts_note}</p>
        )}
        <p className="nopos">{d.ballot_addr_note}</p>
        <Link className="btn" href={`/priorities?lang=${lang}`}>
          {d.set_prios}
        </Link>

        <div className="card" style={{ marginTop: "0.9rem" }}>
          <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.visit_h}</div>
          <p className="nopos" style={{ margin: "0 0 0.15rem" }}>{d.visit_sub}</p>
          <p className="nopos" style={{ margin: "0 0 0.45rem", opacity: 0.7 }}>
            {lang === "es" ? "Estados Unidos" : "United States"}
          </p>
          <form method="post" action="/api/visit" className="admform" style={{ marginTop: 0 }}>
            <input type="hidden" name="lang" value={lang} />
            <select name="jurisdiction" required style={{ flex: 1 }}>
              {Object.entries(
                browsable
                  .filter((j) => j.ocd_id !== displayId)
                  .reduce<Record<string, typeof browsable>>((groups, j) => {
                    (groups[j.group_name] ??= []).push(j);
                    return groups;
                  }, {}),
              ).map(([groupName, items]) => (
                <optgroup key={groupName} label={groupName}>
                  {items.map((j) => (
                    <option key={j.ocd_id} value={j.ocd_id}>
                      {j.level === "municipal" ? `    ${j.name}` : j.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="submit">{d.visit_go}</button>
          </form>
        </div>

        <p className="nopos" style={{ marginTop: "0.9rem" }}>
          <Link href={`/privacy?lang=${lang}`}>{d.priv_link}</Link>
        </p>
      </div>
    </>
  );
}
