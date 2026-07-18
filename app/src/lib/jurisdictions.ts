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
  | { outcome: "no_match"; method: string }; // geocoder couldn't find the address

interface CensusGeography {
  STATE?: string;
  COUNTY?: string;
  NAME?: string;
}
export interface CensusResponse {
  result?: { addressMatches?: { geographies?: Record<string, CensusGeography[]> }[] };
}

/** Pure mapping (unit-tested): Census geographies → pilot jurisdiction. */
export function mapCensusToJurisdiction(data: CensusResponse): "no_match" | "outside" | string {
  const match = data?.result?.addressMatches?.[0];
  if (!match) return "no_match";
  const county = (match.geographies?.["Counties"] ?? [])[0];
  // Montgomery County, MD = state FIPS 24, county FIPS 031
  if (!county || county.STATE !== "24" || county.COUNTY !== "031") return "outside";
  const place = (match.geographies?.["Incorporated Places"] ?? [])[0];
  if (place?.NAME && /^rockville\b/i.test(place.NAME)) return ROCKVILLE;
  return COUNTY;
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
    const mapped = mapCensusToJurisdiction((await res.json()) as CensusResponse);
    if (mapped === "no_match") return { outcome: "no_match", method: CENSUS_RESOLVER };
    if (mapped === "outside") return { outcome: "outside", method: CENSUS_RESOLVER };
    return { outcome: "ok", jurisdiction: mapped, method: CENSUS_RESOLVER };
  } catch {
    // Offline/dev: the format check already passed upstream; fall back to the
    // city matcher so local development keeps working without network.
    return { outcome: "ok", jurisdiction: resolveJurisdictionFromAddress(address), method: FALLBACK_RESOLVER };
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
    not the visit cookie. */
export async function listBrowsableJurisdictions(): Promise<{ ocd_id: string; name: string; level: string }[]> {
  const { rows } = await db().query(
    `SELECT j.ocd_id, j.name, j.level
       FROM jurisdictions j
      WHERE EXISTS (SELECT 1 FROM offices o WHERE o.jurisdiction_id = j.ocd_id AND o.is_elected)
      ORDER BY j.level, j.name`,
  );
  return rows as { ocd_id: string; name: string; level: string }[];
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
