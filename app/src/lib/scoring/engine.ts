/**
 * Alignment-scoring engine — implements docs/SCORING.md v0.1 exactly.
 *
 * Pure functions: no DB, no clock ambiguity (the reference date is a parameter),
 * no model calls. Same inputs + same ALGORITHM_VERSION → same output (S1.4).
 */
import { createHash } from "node:crypto";

/* ── v0.1 configuration (SCORING.md S3–S5) — every constant is versioned ── */
export const CONFIG = {
  evidenceWeights: {
    voting_record_inferred: 1.0,
    sponsored_legislation: 0.9, // reserved; not yet a source_type in SCHEMA.sql
    questionnaire: 0.7,
    campaign_site: 0.6,
    debate_transcript: 0.5,
    interview: 0.5,
  } as Record<string, number>,
  recencyHalfLifeYears: 6,
  conflictThresholdUnits: 3,
  coverageGate: 0.5,
  bands: { strong: 0.55, good: 0.2, mixedLow: -0.2 },
  dealbreakerWeight: 5,
  dealbreakerAgreementMax: -1,
} as const;

const cfgHash = createHash("sha256")
  .update(JSON.stringify(CONFIG))
  .digest("hex")
  .slice(0, 8);
export const ALGORITHM_VERSION = `score-v0.1+cfg-${cfgHash}`;

/* ── types ── */
export interface EvidenceCoding {
  value: number; // -2..2, from a usable_for_scoring position_codings row
  sourceType: string; // politician_positions.source_type
  date: string | null; // citation.published_at ?? position.recorded_at (ISO)
}
export interface AxisValueResult {
  value: number | null; // null = no usable evidence (silence)
  conflict: boolean; // vote-derived vs statement-derived differ ≥ threshold
  voteValue: number | null;
  statementValue: number | null;
}
export interface Priority {
  axisId: string;
  direction: 1 | -1;
  weight: 1 | 2 | 3 | 4 | 5;
}
export type OverallBand = "strong" | "good" | "mixed" | "weak" | "insufficient";
export interface CandidateScore {
  overall: OverallBand;
  aggregate: number; // A in [-1, 1] (0 when insufficient)
  coverage: number; // C in [0, 1]
  dealbreaker: boolean;
  answered: number;
  total: number;
  perAxis: Record<string, { agreement: number | null; conflict: boolean }>;
  algorithmVersion: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function recencyMultiplier(date: string | null, asOf: Date): number {
  if (!date) return 1; // undated evidence: no decay rather than invented age
  const ageYears =
    (asOf.getTime() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!Number.isFinite(ageYears) || ageYears <= 0) return 1;
  return Math.pow(0.5, ageYears / CONFIG.recencyHalfLifeYears);
}

function weightedMeanValue(items: EvidenceCoding[], asOf: Date): number | null {
  let num = 0;
  let den = 0;
  for (const e of items) {
    const w =
      (CONFIG.evidenceWeights[e.sourceType] ?? 0) * recencyMultiplier(e.date, asOf);
    num += w * e.value;
    den += w;
  }
  if (den === 0) return null;
  return clamp(Math.round(num / den), -2, 2);
}

/** S3: candidate's value on one axis, with the conflict rule. */
export function axisValue(evidence: EvidenceCoding[], asOf: Date): AxisValueResult {
  const votes = evidence.filter((e) => e.sourceType === "voting_record_inferred");
  const statements = evidence.filter(
    (e) => e.sourceType !== "voting_record_inferred",
  );
  const voteValue = weightedMeanValue(votes, asOf);
  const statementValue = weightedMeanValue(statements, asOf);
  const combined = weightedMeanValue(evidence, asOf);
  const conflict =
    voteValue !== null &&
    statementValue !== null &&
    Math.abs(voteValue - statementValue) >= CONFIG.conflictThresholdUnits;
  // On conflict the vote-derived value governs (SCORING.md S3); both are surfaced.
  const value = conflict ? voteValue : combined;
  return { value, conflict, voteValue, statementValue };
}

/** S4: per-topic agreement. */
export function agreement(axisVal: number | null, direction: 1 | -1): number | null {
  if (axisVal === null) return null;
  return clamp(axisVal * direction, -2, 2);
}

/** S4–S5: full candidate score for one voter. */
export function scoreCandidate(
  priorities: Priority[],
  evidenceByAxis: Record<string, EvidenceCoding[]>,
  asOf: Date = new Date(),
): CandidateScore {
  let num = 0;
  let wAnswered = 0;
  let wAll = 0;
  let answered = 0;
  let dealbreaker = false;
  const perAxis: CandidateScore["perAxis"] = {};

  for (const p of priorities) {
    wAll += p.weight;
    const av = axisValue(evidenceByAxis[p.axisId] ?? [], asOf);
    const a = agreement(av.value, p.direction);
    perAxis[p.axisId] = { agreement: a, conflict: av.conflict };
    if (a !== null) {
      num += p.weight * a;
      wAnswered += p.weight;
      answered += 1;
      if (
        p.weight === CONFIG.dealbreakerWeight &&
        a <= CONFIG.dealbreakerAgreementMax
      ) {
        dealbreaker = true; // marks the card; never changes the aggregate (S5)
      }
    }
  }

  const coverage = wAll > 0 ? wAnswered / wAll : 0;
  const aggregate = wAnswered > 0 ? num / (2 * wAnswered) : 0;

  let overall: OverallBand;
  if (coverage < CONFIG.coverageGate) overall = "insufficient";
  else if (aggregate >= CONFIG.bands.strong) overall = "strong";
  else if (aggregate >= CONFIG.bands.good) overall = "good";
  else if (aggregate > CONFIG.bands.mixedLow) overall = "mixed";
  else overall = "weak";

  return {
    overall,
    aggregate,
    coverage,
    dealbreaker,
    answered,
    total: priorities.length,
    perAxis,
    algorithmVersion: ALGORITHM_VERSION,
  };
}
