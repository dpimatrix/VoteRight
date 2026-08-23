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
  // evidence now included (mobile's tappable per-axis dots need it, same as
  // web's server-rendered page already had for free) -- same public-record
  // citations already shown in full on each candidate's profile page, so
  // sending them here isn't a new disclosure, just an earlier one.
  return Response.json({
    algorithmVersion: results[0]?.score.algorithmVersion ?? null,
    priorities,
    results,
  });
}
