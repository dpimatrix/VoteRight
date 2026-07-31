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
  | { outcome: "ok"; jurisdiction: string; method: string }
  | { outcome: "outside"; method: string } // real address, wrong county — not eligible
  | { outcome: "no_match"; method: string } // geocoder couldn't find the address
  | { outcome: "resolver_unavailable"; method: string }; // geocoder unreachable — never guess a jurisdiction

interface CensusGeography {
  STATE?: string;
  COUNTY?: string;
  NAME?: string;
}
export interface CensusResponse {
  result?: { addressMatches?: { geographies?: Record<string, CensusGeography[]> }[] };
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

/** Data-driven (not unit-tested — hits the DB; covered by the live end-to-end
    verification instead): does a seeded jurisdiction exist for this FIPS pair? A
    seeded municipality inside that county (e.g. Rockville inside Montgomery County)
    takes priority when the Census place name matches one — adding the next county,
    or the next municipality, is a data insert (docs/SCHEMA.sql `jurisdictions`
    rows), never a code change here. */
async function jurisdictionForGeography(geo: ExtractedGeography): Promise<"outside" | string> {
  const county = await db().query(
    `SELECT ocd_id FROM jurisdictions WHERE level = 'county' AND state_fips = $1 AND county_fips = $2`,
    [geo.stateFips, geo.countyFips],
  );
  if (county.rowCount === 0) return "outside";
  const countyOcdId = county.rows[0].ocd_id as string;

  if (geo.placeName) {
    // Census returns e.g. "Rockville city"; jurisdictions.name stores "City of
    // Rockville" — neither is a prefix of the other, so match on the bare place
    // name as a substring of the stored name rather than requiring an exact form.
    const bareName = geo.placeName.replace(/\s+(city|town|cdp|village|borough)$/i, "").trim();
    const muni = await db().query(
      `SELECT ocd_id FROM jurisdictions
        WHERE level = 'municipal' AND parent_ocd_id = $1 AND name ILIKE '%' || $2 || '%'`,
      [countyOcdId, bareName],
    );
    if ((muni.rowCount ?? 0) > 0) return muni.rows[0].ocd_id as string;
  }
  return countyOcdId;
}

export async function resolveJurisdiction(address: string): Promise<Resolution> {
  try {
    const u = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
    u.searchParams.set("address", address);
    u.searchParams.set("benchmark", "Public_AR_Current");
    u.searchParams.set("vintage", "Current_Current");
    u.searchParams.set("layers", "Counties,Incorporated Places");
    u.searchParams.set("format", "json");
    const res = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`census ${res.status}`);
    const geo = extractCensusGeography((await res.json()) as CensusResponse);
    if (geo === "no_match") return { outcome: "no_match", method: CENSUS_RESOLVER };
    const mapped = await jurisdictionForGeography(geo);
    if (mapped === "outside") return { outcome: "outside", method: CENSUS_RESOLVER };
    return { outcome: "ok", jurisdiction: mapped, method: CENSUS_RESOLVER };
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
      return { outcome: "ok", jurisdiction: resolveJurisdictionFromAddress(address), method: FALLBACK_RESOLVER };
    }
    return { outcome: "resolver_unavailable", method: FALLBACK_RESOLVER };
  }
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
}

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
     SELECT o.id, o.title, o.level, o.seat_count, r.id AS race_id, r.seats_elected,
            s.ocd_id AS jurisdiction_id, s.name AS jurisdiction_name, s.depth
       FROM stack s
       JOIN offices o ON o.jurisdiction_id = s.ocd_id AND o.is_elected
       LEFT JOIN races r ON r.office_id = o.id
      ORDER BY s.depth, o.level, o.title`,
    [jurisdictionId],
  );
  return rows as StackedOffice[];
}

export async function userResidence(userId: string): Promise<{ ocd_id: string; name: string; level: string } | null> {
  const { rows } = await db().query(
    `SELECT j.ocd_id, j.name, j.level
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
