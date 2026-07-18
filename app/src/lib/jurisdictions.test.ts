import { describe, expect, it } from "vitest";
import {
  COUNTY,
  mapCensusToJurisdiction,
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

describe("mapCensusToJurisdiction (production resolver mapping)", () => {
  const resp = (geos: Record<string, object[]> | null): CensusResponse =>
    geos === null ? { result: { addressMatches: [] } } : { result: { addressMatches: [{ geographies: geos }] } };

  it("maps a Rockville match to the city", () => {
    expect(
      mapCensusToJurisdiction(
        resp({ Counties: [{ STATE: "24", COUNTY: "031" }], "Incorporated Places": [{ NAME: "Rockville city" }] }),
      ),
    ).toBe(ROCKVILLE);
  });

  it("maps unincorporated Montgomery to the county", () => {
    expect(mapCensusToJurisdiction(resp({ Counties: [{ STATE: "24", COUNTY: "031" }] }))).toBe(COUNTY);
  });

  it("other incorporated places in the county still map to the county stack", () => {
    expect(
      mapCensusToJurisdiction(
        resp({ Counties: [{ STATE: "24", COUNTY: "031" }], "Incorporated Places": [{ NAME: "Gaithersburg city" }] }),
      ),
    ).toBe(COUNTY);
  });

  it("flags addresses outside the county", () => {
    expect(mapCensusToJurisdiction(resp({ Counties: [{ STATE: "24", COUNTY: "003" }] }))).toBe("outside"); // Anne Arundel
    expect(mapCensusToJurisdiction(resp({ Counties: [{ STATE: "11", COUNTY: "001" }] }))).toBe("outside"); // DC
  });

  it("flags unmatchable addresses", () => {
    expect(mapCensusToJurisdiction(resp(null))).toBe("no_match");
    expect(mapCensusToJurisdiction({} as CensusResponse)).toBe("no_match");
  });
});
