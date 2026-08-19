import { currentUserId } from "@/lib/anon";
import { exportPrioritiesCsv, hasTierAtLeast } from "@/lib/subscriptions";

export async function GET() {
  const userId = await currentUserId();
  if (!userId || !(await hasTierAtLeast(userId, "supporter"))) {
    return new Response("Supporter tier or higher required", { status: 403 });
  }
  const csv = await exportPrioritiesCsv(userId);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-priorities.csv"',
    },
  });
}
