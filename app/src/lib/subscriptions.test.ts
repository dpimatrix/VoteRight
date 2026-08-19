import { describe, expect, it } from "vitest";
import { csvEscape } from "./subscriptions";

describe("csvEscape (priorities export, §14.1)", () => {
  it("leaves a plain field untouched", () => {
    expect(csvEscape("Transit")).toBe("Transit");
  });
  it("quotes and escapes a field containing a comma", () => {
    expect(csvEscape("Housing, affordability")).toBe('"Housing, affordability"');
  });
  it("quotes and doubles internal quotes", () => {
    expect(csvEscape('She said "yes"')).toBe('"She said ""yes"""');
  });
  it("quotes a field containing a newline", () => {
    expect(csvEscape("line one\nline two")).toBe('"line one\nline two"');
  });
});
