import { candidatesInRace, evidenceForPoliticians, loadPriorities } from "./queries";
import { scoreCandidate, type CandidateScore } from "./scoring/engine";

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

/** Score every candidate in a race against one voter's priorities (SCORING.md S4–S5). */
export async function matchesForRace(raceId: string, userId: string) {
  const priorities = await loadPriorities(userId);
  const cands = await candidatesInRace(raceId);
  const evidence = await evidenceForPoliticians(cands.map((c) => c.politician_id));

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
