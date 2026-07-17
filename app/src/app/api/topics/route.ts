import { topicsWithAxes } from "@/lib/queries";

export async function GET() {
  return Response.json({ topics: await topicsWithAxes() });
}
