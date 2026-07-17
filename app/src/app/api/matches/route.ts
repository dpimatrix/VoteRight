import { currentUserId } from "@/lib/anon";
import { matchesForRace } from "@/lib/matches";

export async function GET(request: Request) {
  const raceId = new URL(request.url).searchParams.get("race");
  if (!raceId) return Response.json({ error: "race parameter required" }, { status: 400 });
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "no priorities set" }, { status: 409 });
  const { priorities, results } = await matchesForRace(raceId, userId);
  if (priorities.length < 3) {
    return Response.json({ error: "no priorities set" }, { status: 409 });
  }
  return Response.json({
    algorithmVersion: results[0]?.score.algorithmVersion ?? null,
    priorities,
    results: results.map(({ evidence: _evidence, ...r }) => r),
  });
}
