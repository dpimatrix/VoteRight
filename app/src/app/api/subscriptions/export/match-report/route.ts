import { currentUserId } from "@/lib/anon";
import { exportMatchReportCsv, hasTierAtLeast } from "@/lib/subscriptions";

export async function GET() {
  const userId = await currentUserId();
  if (!userId || !(await hasTierAtLeast(userId, "patron"))) {
    return new Response("Civic Patron tier or higher required", { status: 403 });
  }
  const csv = await exportMatchReportCsv(userId);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-match-report.csv"',
    },
  });
}
