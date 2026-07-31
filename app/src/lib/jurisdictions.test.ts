import { describe, expect, it } from "vitest";
import {
  COUNTY,
  extractCensusGeography,
  ROCKVILLE,
  resolveJurisdictionFromAddress,
  type CensusResponse,
} from "./jurisdictions";

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
