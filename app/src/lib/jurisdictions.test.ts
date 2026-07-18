import { describe, expect, it } from "vitest";
import { COUNTY, ROCKVILLE, resolveJurisdictionFromAddress } from "./jurisdictions";

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
