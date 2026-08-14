import { describe, expect, it } from "vitest";
import {
  COUNTY,
  extractCensusGeography,
  extractCoordinates,
  extractDistricts,
  filterToOwnDistricts,
  hasUnnarrowedDistrictSeats,
  ROCKVILLE,
  resolveJurisdictionFromAddress,
  type CensusResponse,
  type ExtractedDistricts,
  type StackedOffice,
} from "./jurisdictions";

// Shorthand for filterToOwnDistricts test inputs — most tests only care about
// one or two of the five district fields; this fills the rest with null so
// each test case only needs to name what it's actually exercising.
const districts = (overrides: Partial<ExtractedDistricts>): ExtractedDistricts => ({
  congressional: null, stateSenate: null, stateHouse: null, countyCouncil: null, boardOfEducation: null,
  ...overrides,
});

describe("resolveJurisdictionFromAddress (dev resolver, vendor seam)", () => {
  it("detects Rockville regardless of case or position", () => {
    expect(resolveJurisdictionFromAddress("101 Monroe St, Rockville, MD")).toBe(ROCKVILLE);
    expect(resolveJurisdictionFromAddress("101 monroe st, ROCKVILLE md")).toBe(ROCKVILLE);
  });

  it("defaults to the county for unincorporated addresses", () => {
    expect(resolveJurisdictionFromAddress("8700 Georgia Ave, Silver Spring, MD")).toBe(COUNTY);
    expect(resolveJurisdictionFromAddress("1 Main St, Bethesda, Maryland")).toBe(COUNTY);
  });

  it("does not false-positive on substrings of other words", () => {
    // \b guard: 'Rockvillegate Ln' is not the city
    expect(resolveJurisdictionFromAddress("5 Rockvillegate Ln, Olney, MD")).toBe(COUNTY);
  });
});

describe("extractCensusGeography (production resolver, pure extraction)", () => {
  const resp = (geos: Record<string, object[]> | null): CensusResponse =>
    geos === null ? { result: { addressMatches: [] } } : { result: { addressMatches: [{ geographies: geos }] } };

  it("extracts state/county FIPS and place name from a match", () => {
    expect(
      extractCensusGeography(
        resp({ Counties: [{ STATE: "24", COUNTY: "031" }], "Incorporated Places": [{ NAME: "Rockville city" }] }),
      ),
    ).toEqual({ stateFips: "24", countyFips: "031", placeName: "Rockville city" });
  });

  it("extracts a county match with no incorporated place", () => {
    expect(extractCensusGeography(resp({ Counties: [{ STATE: "24", COUNTY: "031" }] }))).toEqual({
      stateFips: "24",
      countyFips: "031",
      placeName: null,
    });
  });

  it("extracts FIPS for counties outside the pilot area just the same — whether that's a seeded jurisdiction is jurisdictionForGeography's job, not this function's", () => {
    expect(extractCensusGeography(resp({ Counties: [{ STATE: "24", COUNTY: "003" }] }))).toEqual({
      stateFips: "24",
      countyFips: "003",
      placeName: null,
    });
    expect(extractCensusGeography(resp({ Counties: [{ STATE: "11", COUNTY: "001" }] }))).toEqual({
      stateFips: "11",
      countyFips: "001",
      placeName: null,
    });
  });

  it("flags unmatchable addresses", () => {
    expect(extractCensusGeography(resp(null))).toBe("no_match");
    expect(extractCensusGeography({} as CensusResponse)).toBe("no_match");
  });

  it("flags a match missing state/county fields as unmatchable", () => {
    expect(extractCensusGeography(resp({ Counties: [{}] }))).toBe("no_match");
  });
});

// jurisdictionForGeography (which FIPS pairs are actually seeded, and municipality
// matching) hits the database directly and is deliberately not unit-tested here —
// see the plan's live end-to-end verification instead: a real address in each of
// Montgomery/Prince George's/Fairfax/Arlington/D.C. resolves to the correct seeded
// jurisdiction via /api/verify, and a non-seeded county still returns "outside".

describe("extractDistricts (D6 gap #5 — production resolver, pure extraction)", () => {
  const resp = (geos: Record<string, object[]>): CensusResponse => ({ result: { addressMatches: [{ geographies: geos }] } });

  it("extracts all three district numbers from a live-shaped response", () => {
    // Real BASENAME values observed live this session for a Rockville, MD test
    // address (D6 gap #5 research) — congressional 8, state senate/house 17.
    expect(
      extractDistricts(
        resp({
          "119th Congressional Districts": [{ BASENAME: "8" }],
          "2024 State Legislative Districts - Upper": [{ BASENAME: "17" }],
          "2024 State Legislative Districts - Lower": [{ BASENAME: "17" }],
        }),
      ),
    ).toEqual(districts({ congressional: "8", stateSenate: "17", stateHouse: "17" }));
  });

  it("keeps Maryland's split sub-district letter (e.g. 34A), not just the number", () => {
    expect(extractDistricts(resp({ "2024 State Legislative Districts - Lower": [{ BASENAME: "34A" }] }))).toEqual(
      districts({ stateHouse: "34A" }),
    );
  });

  it("yields null per-field, never throws, when a layer wasn't requested or the geocoder didn't cover it — a stale/renumbered layer name (Congress renumbers every 2 years) degrades to this, not a crash", () => {
    expect(extractDistricts(resp({ Counties: [{ STATE: "24", COUNTY: "031" }] }))).toEqual(districts({}));
  });

  it("yields all-null for an unmatched address, same as a covered-but-empty response", () => {
    expect(extractDistricts({ result: { addressMatches: [] } })).toEqual(districts({}));
    expect(extractDistricts({} as CensusResponse)).toEqual(districts({}));
  });

  it("always leaves countyCouncil/boardOfEducation null — those are Montgomery-County-specific and filled in separately by montgomeryLocalDistricts, never from a Census layer", () => {
    expect(
      extractDistricts(resp({ "119th Congressional Districts": [{ BASENAME: "8" }] })).countyCouncil,
    ).toBeNull();
    expect(
      extractDistricts(resp({ "119th Congressional Districts": [{ BASENAME: "8" }] })).boardOfEducation,
    ).toBeNull();
  });
});

describe("extractCoordinates (feeds the Montgomery County ArcGIS lookups)", () => {
  it("extracts lon/lat from a matched address's coordinates", () => {
    expect(
      extractCoordinates({ result: { addressMatches: [{ coordinates: { x: -77.2014, y: 39.1434 } }] } }),
    ).toEqual({ lon: -77.2014, lat: 39.1434 });
  });

  it("returns null when coordinates are missing or the address didn't match — never a guessed location", () => {
    expect(extractCoordinates({ result: { addressMatches: [{}] } })).toBeNull();
    expect(extractCoordinates({ result: { addressMatches: [] } })).toBeNull();
    expect(extractCoordinates({} as CensusResponse)).toBeNull();
  });
});

describe("filterToOwnDistricts (D6 gap #5 — narrows a resident's own federal/state district seats)", () => {
  const office = (title: string, level = "state"): StackedOffice => ({
    id: title, title, level, seat_count: 1, race_id: null, seats_elected: null,
    jurisdiction_id: "x", jurisdiction_name: "x", depth: 0,
  });

  it("keeps only the resident's own U.S. House district, drops the others in their state", () => {
    const offices = [
      office("U.S. Representative — District 8", "federal"),
      office("U.S. Representative — District 6", "federal"),
      office("U.S. Senator", "federal"),
    ];
    const result = filterToOwnDistricts(offices, districts({ congressional: "8" }));
    expect(result.map((o) => o.title)).toEqual(["U.S. Representative — District 8", "U.S. Senator"]);
  });

  it("keeps only the resident's own state senate and state house seats independently", () => {
    const offices = [
      office("State Senator — District 17"),
      office("State Senator — District 3"),
      office("State Delegate — District 34A"),
      office("State Delegate — District 34B"),
    ];
    const result = filterToOwnDistricts(offices, districts({ stateSenate: "17", stateHouse: "34A" }));
    expect(result.map((o) => o.title)).toEqual(["State Senator — District 17", "State Delegate — District 34A"]);
  });

  it("recognizes every state-legislature title variant this project's ingesters actually produce", () => {
    const offices = [
      office("State Assemblymember — District 5"), // California
      office("State Assembly Member — District 5"), // New Jersey
      office("State Representative — District 5"), // generic
    ];
    const result = filterToOwnDistricts(offices, districts({ stateHouse: "5" }));
    expect(result).toHaveLength(3);
  });

  it("narrows Montgomery County Council and Board of Education seats to the resident's own district (migration 078)", () => {
    const offices = [
      office("County Council — District 3", "county"),
      office("County Council — District 1", "county"),
      office("County Council — At-Large", "county"), // at-large: everyone gets it, never narrowed
      office("Board of Education — District 1", "school_board"),
      office("Board of Education — District 5", "school_board"),
      office("Board of Education — At-Large", "school_board"),
    ];
    const result = filterToOwnDistricts(offices, districts({ countyCouncil: "3", boardOfEducation: "1" }));
    expect(result.map((o) => o.title)).toEqual([
      "County Council — District 3",
      "County Council — At-Large",
      "Board of Education — District 1",
      "Board of Education — At-Large",
    ]);
  });

  it("shows every County Council/BOE district for a non-Montgomery resident — those fields stay null everywhere else", () => {
    const offices = [office("County Council — District 3", "county"), office("County Council — District 1", "county")];
    expect(filterToOwnDistricts(offices, districts({}))).toHaveLength(2);
  });

  it("leaves non-federal/state/Montgomery district seats untouched — PSC, judicial, state board of education", () => {
    const offices = [
      office("Public Service Commission — District 1", "state"),
      office("State Board of Education — District 1", "state"),
      office("Supreme Court — District 1", "judicial"),
    ];
    const result = filterToOwnDistricts(offices, districts({ congressional: "1", stateSenate: "1", stateHouse: "1", countyCouncil: "1", boardOfEducation: "1" }));
    expect(result).toHaveLength(3); // none dropped — this function doesn't know how to narrow these
  });

  it("shows every seat in a tier when that tier's district wasn't resolved — never a guessed district hiding real seats", () => {
    const offices = [office("State Senator — District 17"), office("State Senator — District 3")];
    expect(filterToOwnDistricts(offices, districts({}))).toHaveLength(2);
    expect(filterToOwnDistricts(offices, null)).toHaveLength(2);
  });

  it("leaves at-large and non-district seats (Governor, U.S. Senator) untouched", () => {
    const offices = [office("Governor", "state"), office("U.S. Senator", "federal")];
    expect(filterToOwnDistricts(offices, districts({ congressional: "8", stateSenate: "17", stateHouse: "17" }))).toHaveLength(2);
  });
});

describe("hasUnnarrowedDistrictSeats (drives the ballot page's disclosure banner)", () => {
  const office = (title: string, level = "state"): StackedOffice => ({
    id: title, title, level, seat_count: 1, race_id: null, seats_elected: null,
    jurisdiction_id: "x", jurisdiction_name: "x", depth: 0,
  });

  it("is false when every district-shaped seat is one this project knows how to narrow, even if the title still says 'District'", () => {
    // A correctly-narrowed U.S. House seat still has "District 8" in its
    // title (narrowing selects the row, it doesn't rename it) — a naive
    // .includes("District") check would wrongly flag this as unnarrowed.
    const offices = [office("U.S. Representative — District 8", "federal"), office("County Council — District 3", "county")];
    expect(hasUnnarrowedDistrictSeats(offices)).toBe(false);
  });

  it("is true when a genuinely unrecognized district-shaped seat is present — e.g. a non-Montgomery county council", () => {
    const offices = [office("Public Service Commission — District 1")];
    expect(hasUnnarrowedDistrictSeats(offices)).toBe(true);
  });

  it("is false when there are no district-shaped seats at all", () => {
    expect(hasUnnarrowedDistrictSeats([office("Governor"), office("U.S. Senator", "federal")])).toBe(false);
  });
});
