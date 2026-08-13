import { describe, expect, it } from "vitest";
import { addressLooksValid } from "./debates";

// Widened 2026-08-13 from a DMV-only (MD/VA/DC) pre-check to all 50 states +
// DC, once nationwide federal/state coverage made every real US address a
// candidate (see jurisdictionForGeography's state-level fallback in
// jurisdictions.ts). This is only a cheap plausibility pre-check -- the real
// gate is the live Census geocoder call right after it -- but a false
// negative here would silently reject a real address before that call ever
// runs, which is exactly the bug this widening fixes.
describe("addressLooksValid", () => {
  it("accepts real addresses across a spread of non-DMV states (abbreviation form)", () => {
    expect(addressLooksValid("123 Main St, Columbus, OH 43215")).toBe(true);
    expect(addressLooksValid("500 5th Ave, New York, NY 10110")).toBe(true);
    expect(addressLooksValid("1 Apple Park Way, Cupertino, CA 95014")).toBe(true);
    expect(addressLooksValid("233 S Wacker Dr, Chicago, IL 60606")).toBe(true);
    expect(addressLooksValid("1600 Pennsylvania Ave, Honolulu, HI 96813")).toBe(true);
  });

  it("still accepts the original DMV pilot area (abbreviation and full-name forms)", () => {
    expect(addressLooksValid("1350 Pennsylvania Avenue NW, Washington, DC 20004")).toBe(true);
    expect(addressLooksValid("12000 Government Center Pkwy, Fairfax, VA 22035")).toBe(true);
    expect(addressLooksValid("100 Maryland Ave, Rockville, Maryland 20850")).toBe(true);
    expect(addressLooksValid("1 Capitol St, Washington, District of Columbia 20001")).toBe(true);
  });

  it("is case-insensitive on the state token", () => {
    expect(addressLooksValid("123 Main St, Columbus, oh 43215")).toBe(true);
    expect(addressLooksValid("123 Main St, Columbus, Oh 43215")).toBe(true);
  });

  it("rejects text with no recognizable state token", () => {
    expect(addressLooksValid("123 Main Street, Somewhere")).toBe(false);
    expect(addressLooksValid("not an address")).toBe(false);
  });

  it("rejects strings under the 12-character floor even with a state token", () => {
    expect(addressLooksValid("1 St, VA")).toBe(false);
  });

  it("rejects a bare number with no street or state", () => {
    expect(addressLooksValid("123")).toBe(false);
  });
});
