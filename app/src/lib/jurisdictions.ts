import { db } from "./db";

/* Address-driven jurisdiction resolution. The verified address determines the
   user's jurisdiction STACK (municipality → county → state), and the ballot
   shows every seat that stack elects — the prototype's Silver-Spring-vs-
   Rockville toggle, driven by the real address instead of a demo switch. */

export const COUNTY = "ocd-division/country:us/state:md/county:montgomery";
export const ROCKVILLE = "ocd-division/country:us/state:md/place:rockville";
export const RESOLVER_VERSION = "address-city-match-v0.1";

/** Dev/offline fallback resolver (§2.6 — the address is self-attested, never
    matched against any voter file). Production path is the Census geocoder
    below; this regex matcher remains for local dev and network failure. */
export function resolveJurisdictionFromAddress(address: string): string {
  if (/\brockville\b/i.test(address)) return ROCKVILLE;
  return COUNTY;
}

/* ── production resolver: U.S. Census Bureau geocoder (DATA-OPS D1) ──
   Official, free, no API key, called ONCE server-side at submit — never
   keystroke-by-keystroke, and never from the browser (the §10 decision
   recorded on the /verify form). Returns county + incorporated-place
   geographies directly. The raw address is still never stored. */
export const CENSUS_RESOLVER = "census-geocoder-v1";
export const FALLBACK_RESOLVER = "address-city-match-v0.1-fallback";

export type Resolution =
  | { outcome: "ok"; jurisdiction: string; method: string; districts: ExtractedDistricts }
  | { outcome: "outside"; method: string } // real address, wrong county — not eligible
  | { outcome: "no_match"; method: string } // geocoder couldn't find the address
  | { outcome: "resolver_unavailable"; method: string }; // geocoder unreachable — never guess a jurisdiction

interface CensusGeography {
  STATE?: string;
  COUNTY?: string;
  NAME?: string;
  BASENAME?: string;
}
export interface CensusResponse {
  result?: {
    addressMatches?: {
      geographies?: Record<string, CensusGeography[]>;
      coordinates?: { x?: number; y?: number }; // x=longitude, y=latitude
    }[];
  };
}

/** Pure extraction: the matched address's own coordinates, straight out of
    the SAME Census response already fetched for county/place/district
    resolution — no second geocode. Feeds the Montgomery County ArcGIS
    lookups below (montgomeryLocalDistricts), which need a real lat/lon, not
    a FIPS code. */
export function extractCoordinates(data: CensusResponse): { lon: number; lat: number } | null {
  const c = data?.result?.addressMatches?.[0]?.coordinates;
  return typeof c?.x === "number" && typeof c?.y === "number" ? { lon: c.x, lat: c.y } : null;
}

export interface ExtractedGeography {
  stateFips: string;
  countyFips: string;
  placeName: string | null;
}

/** Pure extraction (unit-tested): Census response → raw FIPS + place name, no
    jurisdiction/DB knowledge at all. Nationwide by construction — every US county
    the geocoder can match produces a FIPS pair here; whether we've actually seeded
    that county is a question for jurisdictionForGeography below, not this function. */
export function extractCensusGeography(data: CensusResponse): "no_match" | ExtractedGeography {
  const match = data?.result?.addressMatches?.[0];
  if (!match) return "no_match";
  const county = (match.geographies?.["Counties"] ?? [])[0];
  if (!county?.STATE || !county?.COUNTY) return "no_match";
  const place = (match.geographies?.["Incorporated Places"] ?? [])[0];
  return { stateFips: county.STATE, countyFips: county.COUNTY, placeName: place?.NAME ?? null };
}

export interface ExtractedDistricts {
  congressional: string | null;
  stateSenate: string | null;
  stateHouse: string | null;
  // Montgomery-County-specific (migration 078) -- unlike the three fields
  // above, these are NOT nationwide Census layers, so they're only ever
  // populated for a Montgomery County resident and stay null everywhere
  // else. See montgomeryLocalDistricts below.
  countyCouncil: string | null;
  boardOfEducation: string | null;
}

/** Pure extraction (unit-tested), same shape as extractCensusGeography: pulls
    the per-address district numbers (Census BASENAME, e.g. "8", "17", "34A"
    for Maryland's split sub-districts) out of the SAME geocoder response
    already fetched for county/place resolution — no second API call. Any
    layer the geocoder didn't return (a request that only asked for
    Counties/Incorporated Places, or a jurisdiction the layer genuinely
    doesn't cover) yields null for that field rather than throwing; callers
    decide what a null district means (this project's answer: keep showing
    every district in that tier and the existing disclosure banner, same as
    before this feature existed — never a wrong guessed district). */
export function extractDistricts(data: CensusResponse): ExtractedDistricts {
  const match = data?.result?.addressMatches?.[0];
  const geos = match?.geographies;
  const basename = (layer: string) => (geos?.[layer] ?? [])[0]?.BASENAME ?? null;
  return {
    congressional: basename("119th Congressional Districts"),
    stateSenate: basename("2024 State Legislative Districts - Upper"),
    stateHouse: basename("2024 State Legislative Districts - Lower"),
    countyCouncil: null, // filled in by montgomeryLocalDistricts, Montgomery County only
    boardOfEducation: null,
  };
}

// Montgomery County's OWN GIS server (montgomeryplans.org) confirmed live
// this session with a real point-in-polygon query -- but confirmed live
// AGAIN, separately, that it's entirely unreachable from the production VPS
// (TCP connection timeout, not a DNS or app-level failure -- almost
// certainly the county's small government server blocking hosting/VPS IP
// ranges as basic anti-bot protection, common for servers at this scale).
// County Council district boundaries are also mirrored on Esri's own
// multi-tenant ArcGIS Online infrastructure by an unrelated third-party org
// (an environmental-justice mapping project, not Montgomery County itself)
// -- confirmed reachable from the VPS. Used deliberately despite being a
// third-party copy (last-modified mid-2025, not live-synced to the county's
// own authoritative source) since the alternative is no Council narrowing
// at all; this is a real, disclosed trust/freshness tradeoff, not a hidden
// one. Board of Education has NO equivalent mirror found anywhere -- left
// disabled (see boardOfEducationDistrict below) rather than guessed.
// Montgomery County FIPS is 24031 (state 24 + county 031) -- callers only
// invoke this for that specific county, never nationwide (see
// resolveJurisdiction).
const MOCO_COUNCIL_DISTRICTS_URL =
  "https://services4.arcgis.com/eeULstZhYSemxYF5/arcgis/rest/services/Election_Boundaries_County_Council/FeatureServer/0/query";

async function arcgisDistrictLookup(url: string, field: string, lon: number, lat: number): Promise<string | null> {
  try {
    const u = new URL(url);
    u.searchParams.set("geometry", `${lon},${lat}`);
    u.searchParams.set("geometryType", "esriGeometryPoint");
    u.searchParams.set("inSR", "4326");
    u.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    u.searchParams.set("outFields", field);
    u.searchParams.set("f", "json");
    const res = await fetch(u, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { attributes?: Record<string, unknown> }[] };
    const value = data.features?.[0]?.attributes?.[field];
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    // Never guess -- an unreachable ArcGIS server (or a genuine non-match,
    // e.g. a point just outside Montgomery County) yields null the same as
    // any other unresolved district: the existing disclosure banner stays
    // honest, filterToOwnDistricts falls back to showing every seat.
    return null;
  }
}

/** This mirror's schema differs from Montgomery County's own (confirmed
    live): there's no clean numeric COUNCIL field, the district number is
    embedded in a NAME string like "District 3". Pure extraction, unit-
    tested independent of the network call. */
export function parseDistrictNumberFromName(name: string | null): string | null {
  const m = name?.match(/District\s+(\d+)/i);
  return m ? m[1] : null;
}

/** Montgomery-County-specific district lookup (migration 078), fired only
    when the resolved jurisdiction is Montgomery County or one of its
    municipalities -- these are NOT a nationwide Census layer the way
    congressional/state-legislative districts are, so this is real,
    per-county infrastructure, not something every state gets for free.
    Board of Education intentionally does not attempt a network call at all
    (no reachable source exists) -- always null, disclosed via the ballot
    page's banner rather than silently omitted. */
export async function montgomeryLocalDistricts(lon: number, lat: number): Promise<{ countyCouncil: string | null; boardOfEducation: string | null }> {
  const name = await arcgisDistrictLookup(MOCO_COUNCIL_DISTRICTS_URL, "NAME", lon, lat);
  return { countyCouncil: parseDistrictNumberFromName(name), boardOfEducation: null };
}

/** Data-driven (not unit-tested — hits the DB; covered by the live end-to-end
    verification instead): does a seeded jurisdiction exist for this FIPS pair? A
    seeded municipality inside that county (e.g. Rockville inside Montgomery County)
    takes priority when the Census place name matches one — adding the next county,
    or the next municipality, is a data insert (docs/SCHEMA.sql `jurisdictions`
    rows), never a code change here.

    County not seeded (true for every county outside the 5 municipal-detail pilot
    areas) falls back to that state's own bare jurisdiction row rather than
    "outside" -- since D6 (2026-08-12/13) every state has real federal + state-level
    officeholder data seeded under exactly that row (Congress and state-legislature
    offices are attached to the plain state jurisdiction id, not a per-county one;
    the country row is its parent), so ballotForJurisdiction's existing recursive
    walk already returns the correct federal+state ballot for free -- no county/
    municipal detail, but never nothing. Only genuinely "outside" if even the state
    row is missing, which shouldn't happen for a real US address post-migration 059
    (all 50 states + DC + the 5 inhabited territories are seeded). Callers use the
    returned level ('state' vs 'county'/'municipal') to disclose the difference --
    see ballot_state_only_note in i18n.ts -- never silently upgrade a partial
    ballot to look complete. */
async function jurisdictionForGeography(geo: ExtractedGeography): Promise<"outside" | string> {
  const county = await db().query(
    `SELECT ocd_id FROM jurisdictions WHERE level = 'county' AND state_fips = $1 AND county_fips = $2`,
    [geo.stateFips, geo.countyFips],
  );
  if (county.rowCount === 0) {
    const state = await db().query(
      `SELECT ocd_id FROM jurisdictions WHERE level = 'state' AND state_fips = $1`,
      [geo.stateFips],
    );
    return state.rowCount ? (state.rows[0].ocd_id as string) : "outside";
  }
  const countyOcdId = county.rows[0].ocd_id as string;

  if (geo.placeName) {
    // Census returns e.g. "Rockville city"; jurisdictions.name stores "City of
    // Rockville" — neither is a prefix of the other, so match on the bare place
    // name as a substring of the stored name rather than requiring an exact form.
    // Census also spells small numbers out in some place names (e.g. "Chevy
    // Chase Section Three village") while this schema's stored names use
    // numerals ("Village of Chevy Chase Section 3", matching every other
    // numbered-seat name in this project) — normalize word-form numbers to
    // digits before matching, or a real Section 3/5 resident's address would
    // silently fail to match their own municipality and fall through to the
    // bare county (caught live: the substring search returned zero rows for
    // "Chevy Chase Section Three" against the stored "Section 3" row).
    const NUMBER_WORDS: Record<string, string> = {
      one: "1", two: "2", three: "3", four: "4", five: "5",
      six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    };
    const bareName = geo.placeName
      .replace(/\s+(city|town|cdp|village|borough)$/i, "")
      .trim()
      .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w);
    // Plain substring matching is ambiguous when one municipality's name is a
    // suffix of another's (e.g. "Town of Brentwood" vs "Town of North
    // Brentwood" — both match a bare substring search for "Brentwood", and
    // without an ORDER BY, rows[0] below is whichever row Postgres happens to
    // return first, not a deterministic pick). A real Brentwood resident could
    // silently land on North Brentwood's jurisdiction (wrong ballot, wrong
    // referendum eligibility) or vice versa. Fixed by preferring an exact
    // "<prefix> of <bareName>" suffix match — "Town of Brentwood" ends with
    // "of Brentwood", "Town of North Brentwood" does not — with shortest-name
    // as a secondary tiebreak for any other future ambiguity.
    const muni = await db().query(
      `SELECT ocd_id FROM jurisdictions
        WHERE level = 'municipal' AND parent_ocd_id = $1 AND name ILIKE '%' || $2 || '%'
        ORDER BY (name ILIKE '%of ' || $2) DESC, length(name) ASC
        LIMIT 1`,
      [countyOcdId, bareName],
    );
    if ((muni.rowCount ?? 0) > 0) return muni.rows[0].ocd_id as string;
  }
  return countyOcdId;
}

// Congress renumbers every 2 years and states redistrict on their own
// schedules — these layer names are dated/versioned by the Census Bureau
// itself and WILL need bumping (119th → 120th after the 2026 election;
// the "2024" legislative-district vintage after the next redistricting
// cycle). A stale layer name here doesn't silently mismatch addresses to
// the wrong district — the geocoder just returns nothing for that layer,
// extractDistricts yields null, and the app falls back to its existing
// "show every district + disclosure banner" behavior. Still worth a
// periodic check rather than leaving it stale indefinitely.
const DISTRICT_LAYERS = "119th Congressional Districts,2024 State Legislative Districts - Upper,2024 State Legislative Districts - Lower";

export async function resolveJurisdiction(address: string): Promise<Resolution> {
  try {
    const u = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
    u.searchParams.set("address", address);
    u.searchParams.set("benchmark", "Public_AR_Current");
    u.searchParams.set("vintage", "Current_Current");
    u.searchParams.set("layers", `Counties,Incorporated Places,${DISTRICT_LAYERS}`);
    u.searchParams.set("format", "json");
    const res = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`census ${res.status}`);
    const data = (await res.json()) as CensusResponse;
    const geo = extractCensusGeography(data);
    if (geo === "no_match") return { outcome: "no_match", method: CENSUS_RESOLVER };
    const mapped = await jurisdictionForGeography(geo);
    if (mapped === "outside") return { outcome: "outside", method: CENSUS_RESOLVER };
    const districts = extractDistricts(data);
    // Montgomery County FIPS = 24031 -- only fire the extra ArcGIS lookups
    // for residents actually in that county (or one of its municipalities,
    // which share the same county FIPS), never nationwide.
    if (geo.stateFips === "24" && geo.countyFips === "031") {
      const coords = extractCoordinates(data);
      if (coords) {
        const local = await montgomeryLocalDistricts(coords.lon, coords.lat);
        districts.countyCouncil = local.countyCouncil;
        districts.boardOfEducation = local.boardOfEducation;
      }
    }
    return { outcome: "ok", jurisdiction: mapped, method: CENSUS_RESOLVER, districts };
  } catch {
    // Local dev only: the crude Rockville/Montgomery regex matcher keeps
    // development working without network. In production this must NEVER
    // silently guess a jurisdiction on a geocoder outage -- that regex only
    // knows two of the now several seeded jurisdictions, and a confident
    // wrong answer here means a real Fairfax/D.C./Gaithersburg address could
    // get silently assigned Montgomery County residence, gating their real
    // ballot, referendum eligibility, and accountability-campaign access
    // wrong. An honest "try again" beats a wrong jurisdiction.
    if (process.env.NODE_ENV !== "production") {
      // The dev fallback has no geocoder response to pull districts from —
      // districts stay null, same as a real address the district layers
      // simply didn't cover. Never guessed.
      return {
        outcome: "ok",
        jurisdiction: resolveJurisdictionFromAddress(address),
        method: FALLBACK_RESOLVER,
        districts: { congressional: null, stateSenate: null, stateHouse: null, countyCouncil: null, boardOfEducation: null },
      };
    }
    return { outcome: "resolver_unavailable", method: FALLBACK_RESOLVER };
  }
}

// Shared between filterToOwnDistricts and hasUnnarrowedDistrictSeats so the
// two can never drift apart — "does this function know how to narrow this
// title" must mean the same thing in both places. Deliberately narrow: only
// titles this project's own ingesters/migrations actually produce for these
// tiers are matched — anything else district-shaped (Public Service
// Commission, judicial, an office with no seat number at all like Governor)
// passes through untouched. County Council and Board of Education added
// migration 078 (Montgomery County only, via montgomeryLocalDistricts);
// every other pilot county's council/school-board districts still fall
// through unmatched until their own GIS source is found.
const OWN_DISTRICT_PATTERN =
  /^(U\.S\. Representative|State Senator|State (?:Representative|Delegate|Assemblymember|Assembly Member)|County Council|Board of Education) — District (\S+)$/;

function districtFieldFor(seatKind: string): keyof ExtractedDistricts | null {
  if (seatKind === "U.S. Representative") return "congressional";
  if (seatKind === "State Senator") return "stateSenate";
  if (seatKind === "County Council") return "countyCouncil";
  if (seatKind === "Board of Education") return "boardOfEducation";
  if (seatKind.startsWith("State ")) return "stateHouse"; // Representative/Delegate/Assemblymember/Assembly Member
  return null;
}

/** Narrows a resident's own ballot to their actual district-based seats,
    dropping every OTHER district in their state/county — the piece that
    makes `ballot_districts_note` unnecessary for the tiers it covers. A
    user with no resolved district for a given tier (pre-migration users,
    the dev fallback resolver, a real address the geocoder's district
    layers didn't cover, or a non-Montgomery resident for the county-level
    fields) sees every seat in that tier, same as before — never a guessed
    district silently hiding real seats. */
export function filterToOwnDistricts(offices: StackedOffice[], districts: ExtractedDistricts | null): StackedOffice[] {
  return offices.filter((o) => {
    const m = o.title.match(OWN_DISTRICT_PATTERN);
    if (!m) return true; // not a seat this function knows how to narrow — leave it alone
    const [, seatKind, districtInTitle] = m;
    const field = districtFieldFor(seatKind);
    const mine = field ? districts?.[field] : null;
    if (!mine) return true; // no resolved district for this tier — show them all, same as before
    return districtInTitle === mine;
  });
}

/** Does this resident's stack include a district-shaped seat this project
    doesn't successfully narrow to a single row? Drives the ballot page's
    disclosure banner. Two distinct cases, both real gaps, both must show
    the banner:
      1. A title this project has no pattern for at all (e.g. a non-
         Montgomery county council) — always un-narrowed by construction.
      2. A RECOGNIZED pattern (e.g. Montgomery Board of Education, or even
         County Council if a specific lookup failed) that still has more
         than one row present after filterToOwnDistricts ran. Checking
         recognition alone isn't enough here — a title match doesn't mean
         narrowing actually succeeded this time (a network-unreachable GIS
         source, a genuine coverage gap, etc. all legitimately fall back to
         "show every row," and that fallback must still count as a gap the
         banner discloses, not silently look complete). */
export function hasUnnarrowedDistrictSeats(offices: StackedOffice[]): boolean {
  const seatKindCounts = new Map<string, number>();
  for (const o of offices) {
    if (!o.title.includes("District")) continue;
    const m = o.title.match(OWN_DISTRICT_PATTERN);
    if (!m) return true; // an unrecognized district-shaped title -- always a gap
    seatKindCounts.set(m[1], (seatKindCounts.get(m[1]) ?? 0) + 1);
  }
  return [...seatKindCounts.values()].some((count) => count > 1);
}

export interface StackedOffice {
  id: string;
  title: string;
  level: string;
  seat_count: number;
  race_id: string | null;
  seats_elected: number | null;
  jurisdiction_id: string;
  jurisdiction_name: string;
  depth: number;
  term_length_years: number;
  // Year of the most recent office_terms.term_start for this office (the
  // current officeholder's term), or null if no term has ever been
  // ingested for it -- e.g. a seat that's genuinely vacant, or one whose
  // roster ingester hasn't run yet. Only the year is pulled out in SQL
  // (EXTRACT) rather than handing back a raw DATE, so callers never have
  // to deal with node-postgres's DATE-to-JS-Date timezone footgun for a
  // value that's only ever used as a year.
  term_start_year: number | null;
}

// The current 2-year election cycle this project's ballot copy is written
// for -- see i18n.ts's on_ballot ("On your ballot in 2026") and
// no_race_this_cycle, both hardcoded to the same year for the same reason:
// bump this alongside those strings when the next cycle starts, not on its
// own (see nextElectionYear's doc comment for why this constant exists at
// all).
export const CURRENT_CYCLE_YEAR = 2026;

/** Every elected seat in the user's jurisdiction stack, deepest (most local)
    jurisdiction first. */
export async function ballotForJurisdiction(jurisdictionId: string): Promise<StackedOffice[]> {
  const { rows } = await db().query(
    `WITH RECURSIVE stack AS (
       SELECT j.ocd_id, j.name, j.parent_ocd_id, 0 AS depth
         FROM jurisdictions j WHERE j.ocd_id = $1
       UNION ALL
       SELECT j.ocd_id, j.name, j.parent_ocd_id, s.depth + 1
         FROM jurisdictions j JOIN stack s ON j.ocd_id = s.parent_ocd_id
     )
     SELECT o.id, o.title, o.level, o.seat_count, o.term_length_years,
            r.id AS race_id, r.seats_elected, ot.term_start_year,
            s.ocd_id AS jurisdiction_id, s.name AS jurisdiction_name, s.depth
       FROM stack s
       JOIN offices o ON o.jurisdiction_id = s.ocd_id AND o.is_elected
       LEFT JOIN races r ON r.office_id = o.id
       LEFT JOIN LATERAL (
         -- MAX, not the row for a specific politician: an office can carry
         -- more than one office_terms row over time (a predecessor's
         -- ended term, a re-election that inserted a fresh term_start
         -- rather than reusing the old one) -- the most recent term_start
         -- is always the one describing the CURRENT officeholder's term.
         SELECT MAX(EXTRACT(YEAR FROM term_start))::int AS term_start_year
           FROM office_terms WHERE office_id = o.id
       ) ot ON true
      ORDER BY s.depth, o.level, o.title`,
    [jurisdictionId],
  );
  return rows as StackedOffice[];
}

/** The next year this office is up for election, from its current term's
    start year + its term length -- e.g. a 4-year term that started in
    2025 is next up in 2028 (term_start_year + term_length_years - 1: the
    election happens the year BEFORE the new term's inauguration/start
    date, not the same year). Null in, null out -- a seat with no ingested
    term (never guess a real officeholder's election year from nothing). */
export function nextElectionYear(termStartYear: number | null, termLengthYears: number): number | null {
  return termStartYear === null ? null : termStartYear + termLengthYears - 1;
}

export interface UserResidence {
  ocd_id: string;
  name: string;
  level: string;
  congressional_district: string | null;
  state_senate_district: string | null;
  state_house_district: string | null;
  county_council_district: string | null;
  board_of_education_district: string | null;
}

export async function userResidence(userId: string): Promise<UserResidence | null> {
  const { rows } = await db().query(
    `SELECT j.ocd_id, j.name, j.level,
            u.congressional_district, u.state_senate_district, u.state_house_district,
            u.county_council_district, u.board_of_education_district
       FROM users u JOIN jurisdictions j ON j.ocd_id = u.residence_jurisdiction_id
      WHERE u.id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Jurisdictions a visitor may browse read-only: anywhere with elected offices.
    Browsing NEVER touches residence or participation rights — every eligibility
    check in the app reads users.residence_jurisdiction_id from the database,
    not the visit cookie.

    groupName is the state (or, for D.C., itself — it has no state parent) so
    callers can render a country → state → county → municipality picker without
    re-deriving the jurisdiction stack client-side. sortKey is the county's own
    name (or the jurisdiction's own name for county/state rows), so a
    municipality always sorts immediately after its parent county within its
    state group. */
export async function listBrowsableJurisdictions(): Promise<
  { ocd_id: string; name: string; level: string; group_name: string; sort_key: string }[]
> {
  const { rows } = await db().query(
    `WITH b AS (
       SELECT j.ocd_id, j.name, j.level, j.parent_ocd_id
         FROM jurisdictions j
        WHERE EXISTS (SELECT 1 FROM offices o WHERE o.jurisdiction_id = j.ocd_id AND o.is_elected)
     )
     SELECT
       b.ocd_id, b.name, b.level,
       COALESCE(st.name, cst.name, b.name) AS group_name,
       COALESCE(county.name, b.name) AS sort_key
       FROM b
       LEFT JOIN jurisdictions county ON county.ocd_id = b.parent_ocd_id AND b.level = 'municipal'
       LEFT JOIN jurisdictions st ON st.ocd_id = b.parent_ocd_id AND st.level = 'state'
       LEFT JOIN jurisdictions cst ON cst.ocd_id = county.parent_ocd_id AND cst.level = 'state'
      ORDER BY group_name, sort_key, b.level`,
  );
  return rows as { ocd_id: string; name: string; level: string; group_name: string; sort_key: string }[];
}

/** The names in the user's stack, deepest first — for the "your ballot covers"
    line on the ballot page. */
export async function stackNames(jurisdictionId: string): Promise<string[]> {
  const { rows } = await db().query(
    `WITH RECURSIVE stack AS (
       SELECT ocd_id, name, parent_ocd_id, 0 AS depth FROM jurisdictions WHERE ocd_id = $1
       UNION ALL
       SELECT j.ocd_id, j.name, j.parent_ocd_id, s.depth + 1
         FROM jurisdictions j JOIN stack s ON j.ocd_id = s.parent_ocd_id
     )
     SELECT name FROM stack ORDER BY depth`,
    [jurisdictionId],
  );
  return rows.map((r) => r.name as string);
}
