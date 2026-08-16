import { currentUserId } from "@/lib/anon";
import { ownRaceIds } from "@/lib/jurisdictions";
import { races } from "@/lib/queries";

// JSON counterpart to matches/page.tsx's race picker -- used by the native
// app. Scoped to the resident's own ballot the same way (see
// ownRaceIds), not just every race in the system.
export async function GET() {
  const userId = await currentUserId();
  const [all, ownIds] = await Promise.all([races(), ownRaceIds(userId)]);
  return Response.json({ races: ownIds ? all.filter((r) => ownIds.has(r.id)) : all });
}
