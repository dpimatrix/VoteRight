import { currentUserId } from "@/lib/anon";
import { userResidence } from "@/lib/jurisdictions";
import { topicsWithAxes } from "@/lib/queries";

// jurisdiction-scoped (migration 105) -- mirrors web's /priorities page.
// Real gap found live 2026-09-22: this was the mobile app's own source for
// the Priorities screen, and had never been jurisdiction-scoped either.
export async function GET() {
  const userId = await currentUserId();
  const residence = userId ? await userResidence(userId) : null;
  return Response.json({ topics: await topicsWithAxes(residence?.ocd_id ?? null) });
}
