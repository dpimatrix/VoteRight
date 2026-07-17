import { currentOrNewUserId, currentUserId } from "@/lib/anon";
import { loadPriorities, savePriorities, type PriorityInput } from "@/lib/queries";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ priorities: [] });
  return Response.json({ priorities: await loadPriorities(userId) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: PriorityInput[] };
  const items = (body.items ?? []).filter(
    (it) =>
      typeof it.axisId === "string" &&
      (it.direction === 1 || it.direction === -1) &&
      Number.isInteger(it.weight) &&
      it.weight >= 1 &&
      it.weight <= 5 &&
      typeof it.statement === "string" &&
      it.statement.length <= 500,
  );
  if (items.length < 3) {
    return Response.json(
      { error: "Pick at least 3 issues (with valid direction and weight 1–5)." },
      { status: 400 },
    );
  }
  const userId = await currentOrNewUserId();
  await savePriorities(userId, items);
  return Response.json({ saved: items.length });
}
