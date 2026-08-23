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
  // Maryland-specific (migration 082) -- the state's 7 appellate judicial
  // circuits (Md. Constitution Art. IV, §14), populated for any Maryland
  // resident (not just Montgomery), stays null everywhere else. See
  // appellateCircuitForCounty below -- a pure offline lookup, no GIS
  // query needed, unlike countyCouncil/boardOfEducation above.
  appellateCircuit: string | null;
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
    appellateCircuit: null, // filled in by appellateCircuitForCounty, Maryland only
  };
}

// Maryland's 7 Appellate Judicial Circuits (Md. Constitution Article IV,
// §14 -- verified directly against the primary constitutional text,
// 2026-08-14, after an earlier AI-summarized search result had already
// gotten this exact county grouping right twice independently, but this
// project doesn't trust that alone -- same discipline as migration 064's
// own note about a prior AI-summarized fetch having hallucinated a real
// fact). Defined by WHOLE COUNTY groupings, not custom GIS polygons --
// meaning circuit assignment is a pure offline lookup from the county
// FIPS this project's Census-geocoder pipeline already resolves for
// every address, no network call needed at all (unlike Montgomery's own
// County Council/Board of Education districts, which really do cut
// across county lines and need a live GIS query). Keyed by the 3-digit
// county-only FIPS (extractCensusGeography's own countyFips shape) --
// callers are responsible for confirming stateFips is Maryland ("24")
// first, same pattern as montgomeryLocalDistricts' own callers.
const MD_APPELLATE_CIRCUIT_BY_COUNTY_FIPS: Record<string, string> = {
  "011": "1", "015": "1", "019": "1", "029": "1", "035": "1", "039": "1", "041": "1", "045": "1", "047": "1", // 1st: Caroline, Cecil, Dorchester, Kent, Queen Anne's, Somerset, Talbot, Wicomico, Worcester
  "005": "2", "025": "2", // 2nd: Baltimore, Harford
  "001": "3", "013": "3", "021": "3", "023": "3", "027": "3", "043": "3", // 3rd: Allegany, Carroll, Frederick, Garrett, Howard, Washington
  "033": "4", // 4th: Prince George's
  "003": "5", "009": "5", "017": "5", "037": "5", // 5th: Anne Arundel, Calvert, Charles, St. Mary's
  "510": "6", // 6th: Baltimore City
  "031": "7", // 7th: Montgomery
};

export function appellateCircuitForCounty(countyFips: string | null): string | null {
  if (!countyFips) return null;
  return MD_APPELLATE_CIRCUIT_BY_COUNTY_FIPS[countyFips] ?? null;
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
// one. Montgomery County FIPS is 24031 (state 24 + county 031) -- callers
// only invoke this for that specific county, never nationwide (see
// resolveJurisdiction).
const MOCO_COUNCIL_DISTRICTS_URL =
  "https://services4.arcgis.com/eeULstZhYSemxYF5/arcgis/rest/services/Election_Boundaries_County_Council/FeatureServer/0/query";

// Found live 2026-08-14: the county's OWN authoritative service, not a
// third-party mirror -- montgomeryplans.org (the domain the Council URL's
// original, still-unreachable source lived on) is unreachable from the
// VPS, but this is a DIFFERENT county domain (gis4.montgomerycountymd.gov,
// the county's own GIS server, not the planning department's separate
// site) -- confirmed reachable from the VPS before shipping. BDED is
// already a plain district number ("3"), no NAME-string parsing needed
// the way the Council mirror requires.
const MOCO_BOE_DISTRICTS_URL =
  "https://gis4.montgomerycountymd.gov/arcgis/rest/services/elections/board_of_ed/FeatureServer/0/query";

// Prince George's County (2026-08-14) -- shares the EXACT SAME title
// format as Montgomery's own County Council seats ("County Council —
// District N"), so this reuses the countyCouncil field directly, no new
// ExtractedDistricts field needed. The county's own GIS host
// (gis.pgatlas.com), NOT onlinegis.princegeorgescountymd.gov (the other
// candidate found -- unreachable, same class of county-server block as
// montgomeryplans.org). DISTRICT_NUMBER is already a plain numeric string
// ("3"), no NAME-string parsing needed. Confirmed live with a real
// point-in-polygon query against a College Park address -- correctly
// returned District 3 (matches the real current councilmember, Eric
// Olson) -- but only checked from this environment, not the VPS;
// verify before fully trusting the same way the BOE lookup above needed
// a second, VPS-side check.
const PG_COUNCIL_DISTRICTS_URL =
  "https://gis.pgatlas.com/pgatlas/rest/services/DARTS/DARTS_MapService/MapServer/12/query";

// DC (2026-08-14, source swapped same day): DC's own government server
// (maps2.dcgis.dc.gov) confirmed unreachable from the VPS -- same class
// of block as montgomeryplans.org and gaithersburgmd.gov hit earlier the
// same day. Real point-in-polygon query against 1600 Pennsylvania Ave NW
// correctly returned Ward 2 (matches the real current councilmember,
// Brooke Pinto, also in this same layer's REP_NAME field) -- but that was
// only ever confirmed from this environment, not the VPS, and the VPS
// check came back empty. Replacement: DCGISgroup's own mirror on Esri's
// shared cloud infrastructure (services.arcgis.com), identical schema,
// confirmed to return the exact same correct result for the same test
// point -- same fix shape as Montgomery's Council districts (a
// third-party-hosted copy of the same official data, not the
// government's own small server). WARD is esriFieldTypeSmallInteger, not
// a string -- arcgisDistrictLookup converts it. DC's seat titles say
// "Council — Ward N", not "County Council — District N" -- a different
// keyword ("Ward") on a jurisdiction with no county layer of its own, but
// the same underlying concept (the resident's own local legislative
// district), so this reuses the countyCouncil field too rather than
// adding a DC-only one.
const DC_WARD_URL =
  "https://services.arcgis.com/neT9SoYxizqTHZPH/arcgis/rest/services/Wards_from_2022_FC/FeatureServer/0/query";

// Fairfax County (2026-08-14) -- the county's own authoritative service
// (services1.arcgis.com/ioennV6PpG5Xodq0, owned by FX.AuthData), confirmed
// reachable, real point-in-polygon queries against the County Government
// Center (Braddock) and a Reston address (Hunter Mill) both correctly
// matched the real current supervisor (this layer's own NAME field:
// Rachna Sizemore Heizer, Walter L. Alcorn). DISTRICT comes back ALL CAPS
// ("BRADDOCK", "HUNTER MILL") -- titleCaseDistrictName below normalizes
// it to match the office titles' own casing ("Braddock", "Hunter Mill").
// Unlike every other seat kind narrowed so far, Fairfax's own titles are
// NAMED, not numbered ("Board of Supervisors — Hunter Mill District",
// the name BEFORE the word "District" this time, not after) -- see
// OWN_NAMED_DISTRICT_PATTERN below.
const FAIRFAX_SUPERVISOR_DISTRICTS_URL =
  "https://services1.arcgis.com/ioennV6PpG5Xodq0/arcgis/rest/services/Supervisor_Districts/FeatureServer/0/query";

/** ALL CAPS from the GIS source ("HUNTER MILL") -> Title Case ("Hunter
    Mill") to match how this project's own office titles are written.
    Pure, unit-tested independent of the network call -- same shape as
    parseDistrictNumberFromName. */
export function titleCaseDistrictName(name: string | null): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

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
    // DC's WARD field is esriFieldTypeSmallInteger, not a string (unlike
    // every other source used so far) -- found live 2026-08-14. Numbers
    // are converted, not just strings passed through.
    if (typeof value === "number") return String(value);
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
    Both lookups fire in parallel and independently fall back to null on
    their own network failure -- one source being down never blocks the
    other. */
export async function montgomeryLocalDistricts(lon: number, lat: number): Promise<{ countyCouncil: string | null; boardOfEducation: string | null }> {
  const [name, bded] = await Promise.all([
    arcgisDistrictLookup(MOCO_COUNCIL_DISTRICTS_URL, "NAME", lon, lat),
    arcgisDistrictLookup(MOCO_BOE_DISTRICTS_URL, "BDED", lon, lat),
  ]);
  return { countyCouncil: parseDistrictNumberFromName(name), boardOfEducation: bded };
}

/** Prince George's-County-specific (2026-08-14). No Board of Education
    equivalent found for this county yet (unlike Montgomery) -- left
    unattempted rather than guessed, same as Montgomery's own BOE was
    before its source was found. */
export async function pgCountyLocalDistricts(lon: number, lat: number): Promise<{ countyCouncil: string | null }> {
  const districtNumber = await arcgisDistrictLookup(PG_COUNCIL_DISTRICTS_URL, "DISTRICT_NUMBER", lon, lat);
  return { countyCouncil: districtNumber };
}

/** DC-specific (2026-08-14). */
export async function dcWardDistrict(lon: number, lat: number): Promise<{ countyCouncil: string | null }> {
  const ward = await arcgisDistrictLookup(DC_WARD_URL, "WARD", lon, lat);
  return { countyCouncil: ward };
}

/** Fairfax-County-specific (2026-08-14). */
export async function fairfaxLocalDistricts(lon: number, lat: number): Promise<{ countyCouncil: string | null }> {
  const district = await arcgisDistrictLookup(FAIRFAX_SUPERVISOR_DISTRICTS_URL, "DISTRICT", lon, lat);
  return { countyCouncil: titleCaseDistrictName(district) };
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
    // Any Maryland county, not just Montgomery -- a pure offline lookup,
    // no network call, so there's no reason to scope this narrower than
    // the state itself the way the Montgomery-only ArcGIS lookups below
    // have to be.
    if (geo.stateFips === "24") {
      districts.appellateCircuit = appellateCircuitForCounty(geo.countyFips);
    }
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
    // Prince George's County FIPS = 24033 (2026-08-14) -- same
    // countyCouncil field as Montgomery above, different source.
    if (geo.stateFips === "24" && geo.countyFips === "033") {
      const coords = extractCoordinates(data);
      if (coords) {
        const local = await pgCountyLocalDistricts(coords.lon, coords.lat);
        districts.countyCouncil = local.countyCouncil;
      }
    }
    // DC FIPS = 11/001 (2026-08-14) -- DC is its own state-equivalent AND
    // county-equivalent for Census purposes (migration 004).
    if (geo.stateFips === "11" && geo.countyFips === "001") {
      const coords = extractCoordinates(data);
      if (coords) {
        const local = await dcWardDistrict(coords.lon, coords.lat);
        districts.countyCouncil = local.countyCouncil;
      }
    }
    // Fairfax County, VA FIPS = 51059 (2026-08-14).
    if (geo.stateFips === "51" && geo.countyFips === "059") {
      const coords = extractCoordinates(data);
      if (coords) {
        const local = await fairfaxLocalDistricts(coords.lon, coords.lat);
        districts.countyCouncil = local.countyCouncil;
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
        districts: { congressional: null, stateSenate: null, stateHouse: null, countyCouncil: null, boardOfEducation: null, appellateCircuit: null },
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
// Commission, an office with no seat number at all like Governor, Fairfax
// County's own NAMED supervisor districts) passes through untouched until
// its own source is found. County Council and Board of Education added
// migration 078 (Montgomery County); Prince George's County reuses the
// same "County Council — District N" seat kind with its own GIS source
// (2026-08-14) -- no pattern change needed there, just a second lookup
// wired into the same countyCouncil field. DC's "Council — Ward N" added
// the same day needed a real pattern change: a bare "Council" seat kind
// (DC has no county layer of its own to prefix it with) and "Ward"
// alongside "District" as the tier keyword.
const OWN_DISTRICT_PATTERN =
  /^(U\.S\. Representative|State Senator|State (?:Representative|Delegate|Assemblymember|Assembly Member)|County Council|Council|Board of Education) — (?:District|Ward) (\S+)$/;

// Maryland Supreme Court circuit seats (migration 069, "Supreme Court 1st
// Circuit" .. "7th Circuit") added 2026-08-14 -- a genuinely different
// title SHAPE than everything above (no em dash, no literal "District"
// word, an ordinal instead of a bare number), since these are existing
// office titles this project doesn't control the wording of, not
// something matched against OWN_DISTRICT_PATTERN's own convention.
const OWN_CIRCUIT_PATTERN = /^(Supreme Court) (\d+)(?:st|nd|rd|th) Circuit$/;

// Fairfax County's own supervisor districts (migration 005, "Board of
// Supervisors — Braddock District" .. "Sully District") added 2026-08-14
// -- a THIRD distinct title shape: the district is NAMED, not numbered,
// and the word "District" trails the name instead of leading it
// ("Hunter Mill District", not "District Hunter Mill" or "District N").
// "Board of Supervisors — Chairman" (the at-large seat) doesn't end in
// " District" and correctly falls through unmatched, same as any other
// at-large seat.
const OWN_NAMED_DISTRICT_PATTERN = /^(Board of Supervisors) — (.+) District$/;

/** Tries every title shape above and normalizes to the same {seatKind,
    districtInTitle} regardless of which one matched -- the two functions
    below only ever need to care about "did something match," not which
    pattern. */
function matchOwnDistrict(title: string): { seatKind: string; districtInTitle: string } | null {
  const m1 = title.match(OWN_DISTRICT_PATTERN);
  if (m1) return { seatKind: m1[1], districtInTitle: m1[2] };
  const m2 = title.match(OWN_CIRCUIT_PATTERN);
  if (m2) return { seatKind: m2[1], districtInTitle: m2[2] };
  const m3 = title.match(OWN_NAMED_DISTRICT_PATTERN);
  if (m3) return { seatKind: m3[1], districtInTitle: m3[2] };
  return null;
}

function districtFieldFor(seatKind: string): keyof ExtractedDistricts | null {
  if (seatKind === "U.S. Representative") return "congressional";
  if (seatKind === "State Senator") return "stateSenate";
  if (seatKind === "County Council" || seatKind === "Council" || seatKind === "Board of Supervisors") return "countyCouncil";
  if (seatKind === "Board of Education") return "boardOfEducation";
  if (seatKind === "Supreme Court") return "appellateCircuit";
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
    const m = matchOwnDistrict(o.title);
    if (!m) return true; // not a seat this function knows how to narrow — leave it alone
    const field = districtFieldFor(m.seatKind);
    const mine = field ? districts?.[field] : null;
    if (!mine) return true; // no resolved district for this tier — show them all, same as before
    return m.districtInTitle === mine;
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
         banner discloses, not silently look complete).
    The cheap pre-filter below used to just check for the word "District"
    -- broken first by the Supreme Court circuit seats (no "District" at
    all) and again the same day by DC's "Council — Ward N" seats (no
    "District" either). Checks for every shape now. */
export function hasUnnarrowedDistrictSeats(offices: StackedOffice[]): boolean {
  const seatKindCounts = new Map<string, number>();
  for (const o of offices) {
    const looksDistrictShaped =
      o.title.includes("District") || o.title.includes("Ward") || /\d(?:st|nd|rd|th) Circuit$/.test(o.title);
    if (!looksDistrictShaped) continue;
    const m = matchOwnDistrict(o.title);
    if (!m) return true; // an unrecognized district-shaped title -- always a gap
    seatKindCounts.set(m.seatKind, (seatKindCounts.get(m.seatKind) ?? 0) + 1);
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
  // Whether term_start above is verified as the CURRENT term's actual
  // start -- NOT inferred from source (e.g. "is this politician
  // Congress-sourced"), an explicit per-term fact from office_terms.
  // term_start_precise (migration 081). Defaults false (untrusted) at the
  // DATA layer, the safe direction: real bug found live (2026-08-14) --
  // Congress.gov's ingested term_start marks a member's CONTINUOUS,
  // unbroken tenure in a chamber, not their current term -- a senator
  // reelected without a gap keeps their original first-elected year
  // forever, so nextElectionYear's math reads confidently wrong for any
  // reelected incumbent. Auditing the OTHER hand-verified migrations
  // (governors, AG/Treasurer, PSC, ...) for the same day turned up the
  // identical disclosed caveat on governors specifically, and unclear
  // sourcing on most of the rest -- not something safe to infer from a
  // narrow proxy like "is this Congress data" (this flag's predecessor,
  // congress_sourced, worked that way and got replaced by this). Only
  // President/VP are currently marked precise -- a genuinely unambiguous
  // case. Callers must gate on this flag before trusting a computed
  // next-election year.
  term_start_precise: boolean;
  // Officeholder thumbnail pilot (2026-08-14): name + re-hosted-local
  // photo_url (see PolAvatar.tsx) of the SAME officeholder term_start_year
  // describes -- null for any office with no ingested/hand-verified term
  // at all. Deliberately NOT shown for tracked (real race)
  // seats -- see SeatRow: a summary row can't pick one candidate's face out
  // of a contested field without implying an endorsement, but a plain
  // "who currently holds this seat" fact carries no such risk.
  officeholder_name: string | null;
  officeholder_photo_url: string | null;
  // Same officeholder, same scoping -- party is documented public record
  // for a sitting officeholder (not an editorial judgment the way a match
  // score is), so it doesn't carry the photo's "picking a side in a
  // contested race" risk -- as long as it stays scoped to exactly the
  // same rows the photo does (never a specific candidate's party shown
  // ahead of their opponents' on a tracked seat). 'D'/'R'/'I' from
  // db/ingest/congress.mjs's partyCode(), or null if ungiven/unmapped --
  // never guessed, just omitted.
  officeholder_party: string | null;
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
            r.id AS race_id, r.seats_elected,
            ot.term_start_year, COALESCE(ot.term_start_precise, false) AS term_start_precise,
            ot.officeholder_name, ot.officeholder_photo_url, ot.officeholder_party,
            s.ocd_id AS jurisdiction_id, s.name AS jurisdiction_name, s.depth
       FROM stack s
       JOIN offices o ON o.jurisdiction_id = s.ocd_id AND o.is_elected
       LEFT JOIN races r ON r.office_id = o.id
       LEFT JOIN LATERAL (
         -- The single most recent office_terms row for this office (not
         -- just MAX(term_start) -- term_start_precise/officeholder_* need
         -- to come from THAT SAME row, not an unrelated aggregate).
         SELECT EXTRACT(YEAR FROM ot.term_start)::int AS term_start_year,
                ot.term_start_precise,
                p.full_name AS officeholder_name, p.photo_url AS officeholder_photo_url, p.party AS officeholder_party
           FROM office_terms ot JOIN politicians p ON p.id = ot.politician_id
          WHERE ot.office_id = o.id
          ORDER BY ot.term_start DESC
          LIMIT 1
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
  appellate_circuit: string | null;
}

export async function userResidence(userId: string): Promise<UserResidence | null> {
  const { rows } = await db().query(
    `SELECT j.ocd_id, j.name, j.level,
            u.congressional_district, u.state_senate_district, u.state_house_district,
            u.county_council_district, u.board_of_education_district, u.appellate_circuit
       FROM users u JOIN jurisdictions j ON j.ocd_id = u.residence_jurisdiction_id
      WHERE u.id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Race ids actually on this user's own ballot, after the same district
    narrowing the Ballot page/API apply (ballotForJurisdiction +
    filterToOwnDistricts) — used to scope the Matches feature (web page +
    /api/races, which the native app calls) to a resident's real races
    instead of every race in the system. Real gap found live 2026-08-15:
    a Gaithersburg (District 3) address saw all 8 County Council races
    (At-Large + Districts 1-7) under Matches while Ballot correctly showed
    only the 2 actually on their ballot — Matches had never been updated to
    apply this narrowing. Null (not an empty set) when residence is
    unknown — same "show more, never guess" fallback filterToOwnDistricts
    itself uses, so an anonymous/pre-verification user still sees every
    race rather than none. */
export async function ownRaceIds(userId: string | null): Promise<Set<string> | null> {
  const residence = userId ? await userResidence(userId) : null;
  if (!residence) return null;
  const allOffices = await ballotForJurisdiction(residence.ocd_id);
  const offices = filterToOwnDistricts(allOffices, {
    congressional: residence.congressional_district,
    stateSenate: residence.state_senate_district,
    stateHouse: residence.state_house_district,
    countyCouncil: residence.county_council_district,
    boardOfEducation: residence.board_of_education_district,
    appellateCircuit: residence.appellate_circuit,
  });
  return new Set(offices.filter((o): o is StackedOffice & { race_id: string } => o.race_id !== null).map((o) => o.race_id));
}

/** Politicians currently holding an office actually on this user's own
    ballot, after the same district narrowing ownRaceIds() applies above --
    used to scope the Accountability "start a campaign against a politician"
    picker to a resident's own officeholders instead of every politician in
    the system nationwide. Real bug found live 2026-08-22: accountability.ts's
    creatableTargets() fetched every row in `politicians` unscoped --
    harmless back when the pilot had only ~17 seeded people, but silently
    grew into shipping the ENTIRE nationwide roster (9,800+ rows as of this
    fix) to every single Accountability screen load, verified or not,
    regardless of whether the picker section was even shown -- the real
    cause of live-tested "buffering" on that screen. Null (not an empty
    array) when residence is unknown, matching ownRaceIds' own convention --
    but unlike races, an accountability campaign genuinely can't target a
    politician outside the resident's own represented officials, so null/
    empty here means "nothing to offer yet", not "show everyone" the way an
    unscoped list once did. */
export async function ownOfficeholders(
  userId: string | null,
): Promise<
  { id: string; full_name: string; party: string | null; office_title: string; jurisdiction_name: string }[] | null
> {
  const residence = userId ? await userResidence(userId) : null;
  if (!residence) return null;
  const allOffices = await ballotForJurisdiction(residence.ocd_id);
  const offices = filterToOwnDistricts(allOffices, {
    congressional: residence.congressional_district,
    stateSenate: residence.state_senate_district,
    stateHouse: residence.state_house_district,
    countyCouncil: residence.county_council_district,
    boardOfEducation: residence.board_of_education_district,
    appellateCircuit: residence.appellate_circuit,
  });
  const officeIds = offices.map((o) => o.id);
  if (officeIds.length === 0) return [];
  // jurisdiction_name + depth per office, reused from the same stack
  // ballotForJurisdiction already built (depth 0 = the resident's own most
  // local jurisdiction, increasing toward country -- see its own "ORDER BY
  // s.depth" comment). Grouping the politician picker by this (owner asked
  // directly, 2026-08-23: "group by the offices across the ecosystem the
  // address belongs to") reuses the EXACT hierarchy the Ballot screen
  // already groups by, rather than inventing a second, parallel scheme.
  const jurisdictionByOffice = new Map(offices.map((o) => [o.id, { name: o.jurisdiction_name, depth: o.depth }]));
  // Same "most recent office_terms row per office wins" convention
  // ballotForJurisdiction's own lateral join already uses above.
  const { rows } = await db().query(
    `SELECT DISTINCT ON (o.id) o.id AS office_id, p.id, p.full_name, p.party, o.title AS office_title
       FROM offices o
       JOIN office_terms ot ON ot.office_id = o.id
       JOIN politicians p ON p.id = ot.politician_id
      WHERE o.id = ANY($1::uuid[])
      ORDER BY o.id, ot.term_start DESC`,
    [officeIds],
  );
  return (rows as { office_id: string; id: string; full_name: string; party: string | null; office_title: string }[])
    .map((r) => ({
      id: r.id,
      full_name: r.full_name,
      party: r.party,
      office_title: r.office_title,
      jurisdiction_name: jurisdictionByOffice.get(r.office_id)?.name ?? "",
      depth: jurisdictionByOffice.get(r.office_id)?.depth ?? 0,
    }))
    .sort((a, b) => a.depth - b.depth)
    .map(({ depth: _depth, ...rest }) => rest);
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
