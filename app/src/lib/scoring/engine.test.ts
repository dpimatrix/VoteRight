import { describe, expect, it } from "vitest";
import {
  ALGORITHM_VERSION,
  CONFIG,
  agreement,
  axisValue,
  scoreCandidate,
  type EvidenceCoding,
} from "./engine";

const ASOF = new Date("2026-07-16");

describe("SCORING.md S6 worked example", () => {
  it("Trent on rent_stabilization: vote + site statement → +2 → Aligns strongly", () => {
    const evidence: EvidenceCoding[] = [
      { value: 2, sourceType: "voting_record_inferred", date: "2023-07-01" },
      { value: 2, sourceType: "campaign_site", date: "2026-03-01" },
    ];
    const av = axisValue(evidence, ASOF);
    expect(av.value).toBe(2);
    expect(av.conflict).toBe(false);
    expect(agreement(av.value, 1)).toBe(2);
  });

  it("Quinn: no usable coding → silence, excluded but distinguishable", () => {
    const av = axisValue([], ASOF);
    expect(av.value).toBeNull();
    expect(agreement(av.value, 1)).toBeNull();
  });
});

describe("S3 evidence hierarchy", () => {
  it("recency: a 6-year-old statement carries half the weight of a fresh one", () => {
    // fresh -2 (w 0.6) vs 6-year-old +2 (w 0.6 * 0.5 = 0.3) → mean = (-1.2 + 0.6)/0.9 = -0.67 → -1:
    // the fresh statement wins, but the old one still pulls the value off -2
    const av = axisValue(
      [
        { value: -2, sourceType: "campaign_site", date: "2026-07-16" },
        { value: 2, sourceType: "campaign_site", date: "2020-07-16" },
      ],
      ASOF,
    );
    expect(av.value).toBe(-1);
  });

  it("votes outweigh statements at equal recency", () => {
    // vote +2 (1.0) vs site -2 (0.6) → 0.8/1.6 = +0.5 → rounds to +1 (not conflict: |2-(-2)|=4 ≥3 → conflict, vote governs → +2)
    const av = axisValue(
      [
        { value: 2, sourceType: "voting_record_inferred", date: "2026-06-01" },
        { value: -2, sourceType: "campaign_site", date: "2026-06-01" },
      ],
      ASOF,
    );
    expect(av.conflict).toBe(true);
    expect(av.value).toBe(2); // conflict rule: the vote governs
    expect(av.statementValue).toBe(-2); // both surfaced
  });

  it("conflict requires the full threshold — a 2-unit gap blends instead", () => {
    const av = axisValue(
      [
        { value: 2, sourceType: "voting_record_inferred", date: "2026-06-01" },
        { value: 0, sourceType: "questionnaire", date: "2026-06-01" },
      ],
      ASOF,
    );
    expect(av.conflict).toBe(false);
    expect(av.value).toBe(1); // (2*1.0 + 0*0.7)/1.7 = 1.18 → 1
  });
});

describe("S5 aggregation", () => {
  const ev = (v: number): EvidenceCoding[] => [
    { value: v, sourceType: "questionnaire", date: "2026-04-01" },
  ];

  it("coverage gate: <50% weighted coverage → insufficient, regardless of agreement", () => {
    const s = scoreCandidate(
      [
        { axisId: "a", direction: 1, weight: 5 },
        { axisId: "b", direction: 1, weight: 5 },
        { axisId: "c", direction: 1, weight: 4 },
      ],
      { a: ev(2) }, // answered weight 5 of 14 → C = 0.357
      ASOF,
    );
    expect(s.overall).toBe("insufficient");
    expect(s.coverage).toBeCloseTo(5 / 14);
  });

  it("weighted mean + band thresholds", () => {
    const s = scoreCandidate(
      [
        { axisId: "a", direction: 1, weight: 5 }, // agreement +2
        { axisId: "b", direction: 1, weight: 3 }, // agreement +1
        { axisId: "c", direction: -1, weight: 2 }, // evidence +2, dir -1 → -2
      ],
      { a: ev(2), b: ev(1), c: ev(2) },
      ASOF,
    );
    // A = (5*2 + 3*1 + 2*-2) / (2*10) = 9/20 = 0.45 → good
    expect(s.aggregate).toBeCloseTo(0.45);
    expect(s.overall).toBe("good");
    expect(s.dealbreaker).toBe(false);
  });

  it("dealbreaker: weight-5 at agreement ≤ -1 marks, never changes the band", () => {
    const s = scoreCandidate(
      [
        { axisId: "a", direction: 1, weight: 5 }, // +2
        { axisId: "b", direction: 1, weight: 5 }, // +2
        { axisId: "c", direction: 1, weight: 5 }, // evidence -1 → -1 → dealbreaker
      ],
      { a: ev(2), b: ev(2), c: ev(-1) },
      ASOF,
    );
    expect(s.dealbreaker).toBe(true);
    // A = (10 + 10 - 5) / 30 = 0.5 → still "good" — the marker didn't change the math
    expect(s.overall).toBe("good");
  });

  it("silence is excluded from the aggregate but counted against coverage", () => {
    const s = scoreCandidate(
      [
        { axisId: "a", direction: 1, weight: 3 },
        { axisId: "b", direction: 1, weight: 2 }, // silence
      ],
      { a: ev(2) },
      ASOF,
    );
    expect(s.perAxis["b"].agreement).toBeNull();
    expect(s.aggregate).toBe(1); // only answered topics aggregate
    expect(s.coverage).toBeCloseTo(0.6);
    expect(s.overall).toBe("strong");
  });
});

describe("S8 versioning", () => {
  it("algorithm version embeds a hash of every constant", () => {
    // v0.2 (2026-08-29): bumped alongside two real bug fixes below that
    // change the actual computation for some inputs, not just CONFIG
    // (which the cfg- hash half of this string already covers on its own).
    expect(ALGORITHM_VERSION).toMatch(/^score-v0\.2\+cfg-[0-9a-f]{8}$/);
    expect(CONFIG.coverageGate).toBe(0.5);
  });
});

// Regression coverage for two real bugs found live 2026-08-29 (code
// review): both changed v0.1's actual output for some real inputs, hence
// the version bump asserted above.

describe("rounding symmetry (v0.2 fix)", () => {
  it("rounds a negative half-integer tie away from zero, not toward +Infinity", () => {
    // Two equal-weight votes, mean exactly -1.5. Math.round(-1.5) === -1 in
    // JS -- one full unit more favorable than symmetric rounding, and the
    // bug this test guards against.
    const av = axisValue(
      [
        { value: -2, sourceType: "voting_record_inferred", date: null },
        { value: -1, sourceType: "voting_record_inferred", date: null },
      ],
      ASOF,
    );
    expect(av.value).toBe(-2);
  });

  it("rounds the mirror-image positive tie the same direction, for symmetry", () => {
    const av = axisValue(
      [
        { value: 2, sourceType: "voting_record_inferred", date: null },
        { value: 1, sourceType: "voting_record_inferred", date: null },
      ],
      ASOF,
    );
    expect(av.value).toBe(2);
  });
});

describe("aggregate withholding when insufficient (v0.2 fix)", () => {
  const priorities = [
    { axisId: "a", direction: 1 as const, weight: 5 as const },
    { axisId: "b", direction: 1 as const, weight: 5 as const },
    { axisId: "c", direction: 1 as const, weight: 4 as const },
  ];

  it("never returns a nonzero aggregate for an insufficient-coverage candidate", () => {
    // Only axis "a" (weight 5 of 14, coverage ~0.36 < the 0.5 gate) has
    // evidence, and it's a maximal +2 agreement -- the raw aggregate this
    // would otherwise compute to is 1 (the highest possible value), which
    // must never reach a caller once overall === "insufficient".
    const s = scoreCandidate(
      priorities,
      { a: [{ value: 2, sourceType: "voting_record_inferred", date: null }] },
      ASOF,
    );
    expect(s.overall).toBe("insufficient");
    expect(s.aggregate).toBe(0);
  });

  it("still returns the real aggregate once coverage clears the gate", () => {
    const s = scoreCandidate(
      priorities,
      {
        a: [{ value: 2, sourceType: "voting_record_inferred", date: null }],
        b: [{ value: 2, sourceType: "voting_record_inferred", date: null }],
        c: [{ value: 2, sourceType: "voting_record_inferred", date: null }],
      },
      ASOF,
    );
    expect(s.overall).not.toBe("insufficient");
    expect(s.aggregate).toBeGreaterThan(0);
  });
});
