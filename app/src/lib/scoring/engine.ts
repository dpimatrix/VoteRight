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
// v0.2 (2026-08-29): fixed two real bugs in the v0.1 implementation (see
// weightedMeanValue's and scoreCandidate's own comments below) -- the
// manual version component bumps because the actual computation changed
// for some real inputs, not just CONFIG (which cfgHash already covers on
// its own). S1.4's "same inputs + same ALGORITHM_VERSION -> same output"
// promise would otherwise be silently broken for anyone comparing scores
// computed before and after this fix under what looked like an unchanged
// version string.
export const ALGORITHM_VERSION = `score-v0.2+cfg-${cfgHash}`;

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

// Real bug found live 2026-08-29: Math.round resolves .5 ties toward
// +Infinity, not away from zero -- an undisclosed, systematically
// pro-agreement rounding asymmetry SCORING.md's "rounded to the nearest
// integer" rule never specified and no existing test caught. -1.5 rounded
// to -1 (one full unit more favorable than symmetric rounding), while the
// mirror-image +1.5 rounded to +2 -- exactly the kind of directional bias
// SCORING.md S7's partisan-symmetry audit gate (|A(profile)+A(mirror)| ≤
// 0.05) exists to catch. Round-half-away-from-zero treats a negative and
// positive half-integer tie identically.
function roundHalfAwayFromZero(x: number): number {
  return x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5);
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
  return clamp(roundHalfAwayFromZero(num / den), -2, 2);
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
  const rawAggregate = wAnswered > 0 ? num / (2 * wAnswered) : 0;

  let overall: OverallBand;
  if (coverage < CONFIG.coverageGate) overall = "insufficient";
  else if (rawAggregate >= CONFIG.bands.strong) overall = "strong";
  else if (rawAggregate >= CONFIG.bands.good) overall = "good";
  else if (rawAggregate > CONFIG.bands.mixedLow) overall = "mixed";
  else overall = "weak";

  // Real bug found live 2026-08-29: aggregate used to be returned as a real
  // (sometimes maximal, e.g. 1) number even when overall === "insufficient",
  // contradicting this field's own doc comment above ("0 when insufficient")
  // and SCORING.md's rule that an under-coded candidate's fit is withheld,
  // never scored. rawAggregate still decides the band above, using every
  // answered axis regardless of coverage -- only the returned aggregate is
  // zeroed once a candidate has already been placed in "insufficient".
  // Side effect, not a regression: matches.ts sorts candidates within a
  // band tier by aggregate, so multiple insufficient candidates -- already
  // the very last tier, per S1.3 -- now all tie at 0 there instead of
  // ordering by a value nobody sees anyway; they fall back to whatever
  // stable order the race's candidate list itself provided.
  const aggregate = overall === "insufficient" ? 0 : rawAggregate;

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
