import { candidatesInRace, evidenceForPoliticians, loadPriorities, topicsWithAxes } from "./queries";
import { scoreCandidate, type CandidateScore, type Priority } from "./scoring/engine";

export interface PriorityWithAxis extends Priority {
  statement: string;
  question: string;
  negativePole: string;
  positivePole: string;
}

export interface MatchResult {
  politicianId: string;
  candidacyId: string;
  fullName: string;
  party: string | null;
  incumbent: boolean;
  photoUrl: string | null;
  score: CandidateScore;
  evidence: Record<
    string,
    {
      statement: string;
      sourceType: string;
      publisher: string | null;
      title: string | null;
      date: string | null;
      archived: boolean;
    }[]
  >;
}

const OVERALL_ORDER = { strong: 0, good: 1, mixed: 2, weak: 3, insufficient: 4 } as const;

export type PublicCandidateScore = Omit<CandidateScore, "aggregate">;
export interface PublicMatchResult extends Omit<MatchResult, "score"> {
  score: PublicCandidateScore;
}

/** Strips the raw continuous aggregate score before any result crosses a
    client boundary. Real gap found live 2026-08-29: neither /api/matches
    nor the server-rendered /matches page redacted it -- SCORING.md S1.1
    says the UI never shows "87.3/100," only the labeled band, but nothing
    enforced that server-side; MatchResultsList.tsx simply chose not to
    render the field, which is a client-only gate, not a real one (the raw
    number was still sitting in the JSON/RSC payload either way, readable
    from devtools for any real, named candidate). Kept as a strict
    allowlist -- same reasoning paymentVerification.ts's own
    PublicPaymentConfig already documents -- so a future new CandidateScore
    field defaults to NOT exposed until someone deliberately adds it here.

    coverage is deliberately kept, not redacted alongside aggregate: it
    backs the match-completeness bar MatchResultsList already renders, and
    unlike aggregate it doesn't characterize a candidate's political
    position at all, just how much evidence exists to score against. */
export function toPublicResults(results: MatchResult[]): PublicMatchResult[] {
  return results.map((r) => ({
    ...r,
    score: {
      overall: r.score.overall,
      coverage: r.score.coverage,
      dealbreaker: r.score.dealbreaker,
      answered: r.score.answered,
      total: r.score.total,
      perAxis: r.score.perAxis,
      algorithmVersion: r.score.algorithmVersion,
    },
  }));
}

/** Score every candidate in a race against one voter's priorities (SCORING.md S4–S5). */
export async function matchesForRace(raceId: string, userId: string) {
  const [rawPriorities, cands, axes] = await Promise.all([
    loadPriorities(userId),
    candidatesInRace(raceId),
    topicsWithAxes(),
  ]);
  const evidence = await evidenceForPoliticians(cands.map((c) => c.politician_id));

  // Attach each axis's question/poles (used by the tappable per-axis dots --
  // "which of your priorities is driving this band" needs the actual question
  // text, not just the axisId the scoring engine works with).
  const axisById = new Map(axes.map((a) => [a.axis_id, a]));
  const priorities: PriorityWithAxis[] = rawPriorities.map((p) => {
    const a = axisById.get(p.axisId);
    return {
      ...p,
      question: a?.question ?? "",
      negativePole: a?.negative_pole ?? "",
      positivePole: a?.positive_pole ?? "",
    };
  });

  const results: MatchResult[] = cands.map((c) => {
    const byAxis = evidence[c.politician_id] ?? {};
    return {
      politicianId: c.politician_id,
      candidacyId: c.candidacy_id,
      fullName: c.full_name,
      party: c.party,
      incumbent: c.incumbent,
      photoUrl: c.photo_url,
      score: scoreCandidate(priorities, byAxis),
      evidence: byAxis,
    };
  });

  // Insufficient sorts last (never punished with a low band, never hidden — S1.3);
  // within a band tier, higher aggregate first.
  results.sort(
    (a, b) =>
      OVERALL_ORDER[a.score.overall] - OVERALL_ORDER[b.score.overall] ||
      b.score.aggregate - a.score.aggregate,
  );
  return { priorities, results };
}
