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
    expect(ALGORITHM_VERSION).toMatch(/^score-v0\.1\+cfg-[0-9a-f]{8}$/);
    expect(CONFIG.coverageGate).toBe(0.5);
  });
});
