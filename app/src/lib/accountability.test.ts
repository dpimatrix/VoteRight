import { describe, expect, it } from "vitest";
import { buildDisclosure } from "./accountability";

describe("buildDisclosure (§7.4 auto-generated, non-editable)", () => {
  it("always states in-app support is not a signature", () => {
    for (const targetType of ["politician", "charter_or_law_change"] as const) {
      const text = buildDisclosure({
        targetType,
        mechanismType: "charter_amendment_petition",
        legalCitation: "Md. Const. Art. XI-A, Sec. 5",
        isBinding: true,
      });
      expect(text).toContain("not a petition signature");
      expect(text).toContain("no legal effect");
    }
  });

  it("politician campaigns state that no recall exists", () => {
    const text = buildDisclosure({
      targetType: "politician",
      mechanismType: "primary_challenge_support",
      legalCitation: "Md. Election Law Title 5",
      isBinding: false,
    });
    expect(text).toContain("No petition-based recall exists for this office.");
    expect(text).toContain("does not and cannot remove anyone from office");
  });

  it("binding politician mechanisms point at the real process without overpromising", () => {
    const text = buildDisclosure({
      targetType: "politician",
      mechanismType: "supermajority_council_removal",
      legalCitation: "Montgomery County Charter Sec. 118",
      isBinding: true,
    });
    expect(text).toContain("Montgomery County Charter Sec. 118");
    expect(text).toContain("entirely outside this app");
  });

  it("reform campaigns name the binding petition process and its limits", () => {
    const text = buildDisclosure({
      targetType: "charter_or_law_change",
      mechanismType: "charter_amendment_petition",
      legalCitation: "Md. Const. Art. XI-A, Sec. 5",
      isBinding: true,
    });
    expect(text).toContain("real, binding legal process");
    expect(text).toContain("Board of Elections verification");
  });
});
