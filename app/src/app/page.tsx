import { cookies } from "next/headers";
import Link from "next/link";
import { Chev } from "@/components/Chev";
import { PolAvatar } from "@/components/PolAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import {
  ballotForJurisdiction,
  CURRENT_CYCLE_YEAR,
  filterToOwnDistricts,
  hasUnnarrowedDistrictSeats,
  listBrowsableJurisdictions,
  nextElectionYear,
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
  const seatSuffix = o.seat_count > 1 ? ` · ${o.seat_count} ${lang === "es" ? "escaños" : "seats"}` : "";
  const icon = <span className="seat-ic">{officeCode(o.title)}</span>;
  // Officeholder thumbnail pilot (2026-08-14, widened twice same day):
  // swaps the plain office-code badge for the actual current
  // officeholder's photo (or initials, via PolAvatar's own monogram
  // fallback) and shows their name + party underneath the title.
  //
  // Two gates, both load-bearing:
  //  - officeholder_name must exist -- not congress_sourced, which is
  //    about a completely different question (is term_start's semantics
  //    safe to use for the offCycle date math below) and was too narrow a
  //    proxy for "do we know who holds this seat."
  //  - seat_count must be exactly 1. The underlying query picks a
  //    single "most recent term_start" row per office; for a genuinely
  //    multi-seat office (County Council At-Large's 4 seats, the
  //    Appellate Court's 14) that's just ONE of several current holders,
  //    picked arbitrarily -- showing their face as if they represent the
  //    whole seat would be actively misleading, not just incomplete, so
  //    multi-seat offices always keep the plain code badge regardless of
  //    tracked/judicial status.
  //
  // Owner decision 2026-08-14: shown on EVERY seat type now, including
  // tracked (contested-race) and judicial ones -- this is deliberately
  // the sitting OFFICEHOLDER's photo, never a specific candidate's, so it
  // doesn't pick a side among challengers the way showing one candidate's
  // face would; a judge's photo carries no match-score implication
  // either, so it doesn't conflict with judicial seats' "no scoring"
  // policy. Superseded the previous tracked/judicial exclusion.
  const hasOfficeholder = o.seat_count === 1 && !!o.officeholder_name;
  const avatar = hasOfficeholder ? (
    <PolAvatar name={o.officeholder_name!} photoUrl={o.officeholder_photo_url} size={40} />
  ) : (
    icon
  );
  // The photo alone doesn't say who it's a photo OF -- a name right under
  // the title is what actually makes it useful, not just decorative. Party
  // is documented public record for a sitting officeholder (not an
  // editorial judgment the way a match score is), so it's shown plainly
  // as a letter -- no red/blue color-coding, which this app has no
  // existing convention for and would risk reading as taking a side.
  const holderName = hasOfficeholder ? (
    <span className="sholder">
      {o.officeholder_name}
      {o.officeholder_party ? ` (${o.officeholder_party})` : ""}
    </span>
  ) : null;
  if (o.level === "judicial") {
    // Always "on ballot" text here regardless of `tracked` -- judicial
    // seats are never municipal, and the tracked||non-municipal condition
    // used below is therefore always true for this branch (TS narrows
    // o.level to the literal "judicial" inside this block, which is why
    // that condition can't just be inlined here the way it is below).
    const meta = d.on_ballot + seatSuffix;
    return (
      <div className="seat wrap">
        {avatar}
        <span className="sname">
          {o.title}
          {holderName}
          <span className="smeta">{meta}</span>
        </span>
        <span className="chip band bnull">⚖ {d.judicial}</span>
        <span className="snote">{d.jud_note}</span>
      </div>
    );
  }
  // An untracked non-municipal seat used to always claim "On your ballot in
  // 2026" -- true for most county seats (which is why that default still
  // applies below), but flatly wrong for offices with multi-year terms not
  // up this cycle: the President (next election 2028), a governor elected
  // off-cycle from this project's home state, etc. Real, live bug
  // (2026-08-14) -- a resident's ballot told them offices were up for
  // election that plainly weren't.
  //
  // term_length_years > 2 excludes House seats on purpose, not as an
  // approximation: a 2-year term is ALWAYS up next cycle regardless of
  // when the incumbent was first elected, so no date math is even needed
  // there. !congress_sourced excludes Senate for a real data reason, found
  // the same day: Congress.gov's ingested term_start marks a member's
  // CONTINUOUS tenure in that chamber, not their current term -- reelected
  // without a gap, and it never resets. Computing "next election" from it
  // is confidently wrong for any incumbent past their first term (a
  // senator since 2017, reelected 2022, still reads as "started 2017" and
  // would show a next-election year already in the past). No reliable
  // per-senator term-start source exists yet (the ingester never labeled
  // Senate Class for the same reason) -- Senate falls back to the same
  // "on ballot" assumption as before this fix, honestly disclosing
  // nothing rather than confidently claiming a wrong year. Hand-verified
  // single-office migrations (President, governors, ...) aren't
  // congress_sourced and keep the real fix below.
  const nextYear = nextElectionYear(o.term_start_year, o.term_length_years);
  const offCycle =
    o.level !== "municipal" &&
    !tracked &&
    o.term_length_years > 2 &&
    !o.congress_sourced &&
    nextYear !== null &&
    nextYear !== CURRENT_CYCLE_YEAR;
  if (offCycle) {
    return (
      <div className="seat">
        {avatar}
        <span className="sname">
          {o.title}
          {holderName}
          <span className="smeta">{d.next_election_note.replace("%s", String(nextYear)) + seatSuffix}</span>
        </span>
        <span className="chip band bnull">{d.off_cycle}</span>
      </div>
    );
  }
  const meta = (tracked || o.level !== "municipal" ? d.on_ballot : d.no_race_this_cycle) + seatSuffix;
  if (!tracked) {
    return (
      <div className="seat">
        {avatar}
        <span className="sname">
          {o.title}
          {holderName}
          <span className="smeta">{meta}</span>
        </span>
        <span className="chip band bnull">{d.later}</span>
      </div>
    );
  }
  return (
    <Link className="seat" href={`/matches?race=${o.race_id}&lang=${lang}`}>
      {avatar}
      <span className="sname">
        {o.title}
        {holderName}
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

  const allOffices = displayId ? await ballotForJurisdiction(displayId) : [];
  // Narrow to the resident's own district-based seats — but only on their
  // own ballot, never while browsing another jurisdiction as a visitor: a
  // visitor's own resolved district (if they have one at all) has nothing
  // to do with the jurisdiction they're looking at.
  const offices = visited
    ? allOffices
    : filterToOwnDistricts(allOffices, residence
        ? {
            congressional: residence.congressional_district,
            stateSenate: residence.state_senate_district,
            stateHouse: residence.state_house_district,
            countyCouncil: residence.county_council_district,
            boardOfEducation: residence.board_of_education_district,
          }
        : null);

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
        {residence && (
          <p className="nopos" style={{ marginTop: "0.4rem" }}>
            {lang === "es" ? "Verificado como" : "Verified as"} <strong>{residence.name}</strong>{" "}
            <Link href={`/verify?lang=${lang}&change=1`}>{lang === "es" ? "Cambiar dirección" : "Change address"}</Link>
          </p>
        )}
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
            // Real bug fixed 2026-08-14: this used to render ONLY the three
            // sub-group levels once any of them was present, silently
            // dropping every office at any OTHER level in the same
            // jurisdiction. Harmless while only county-level jurisdictions
            // ever had a judicial/school_board sub-group (those offices
            // never coexisted with federal/state-level ones) -- became a
            // real, severe bug once state supreme/appellate court justices
            // (level='judicial') started living on the same STATE
            // jurisdiction row as that state's own federal (Congress) and
            // state (Governor, etc.) offices, which then vanished from the
            // ballot entirely for every state with judicial data. `other`
            // now renders everything NOT in one of the three special
            // levels, same as the no-sub-groups branch below would have.
            const other = rows.filter((o) => !(SUB_GROUP_LEVELS as readonly string[]).includes(o.level));
            return (
              <div key={j.id}>
                {other.length > 0 && (
                  <section>
                    <div className="grouph">{j.name}</div>
                    {other.map((o) => (
                      <SeatRow key={o.id} o={o} lang={lang} d={d} />
                    ))}
                  </section>
                )}
                {SUB_GROUP_LEVELS.map((level) => {
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
                })}
              </div>
            );
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
        {!visited && residence?.level === "state" && (
          <p className="nopos">{d.ballot_state_only_note}</p>
        )}
        {hasUnnarrowedDistrictSeats(offices) && (
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
            <select name="jurisdiction" required defaultValue="" style={{ flex: 1 }}>
              <option value="" disabled>
                {lang === "es" ? "Elige un área" : "Choose an area"}
              </option>
              {Object.entries(
                browsable.reduce<Record<string, typeof browsable>>((groups, j) => {
                  (groups[j.group_name] ??= []).push(j);
                  return groups;
                }, {}),
              ).map(([groupName, items]) => (
                <optgroup key={groupName} label={groupName}>
                  {items.map((j) => (
                    <option key={j.ocd_id} value={j.ocd_id} disabled={j.ocd_id === displayId}>
                      {j.level === "municipal" ? `    ${j.name}` : j.name}
                      {j.ocd_id === displayId ? (lang === "es" ? " (actual)" : " (current)") : ""}
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
