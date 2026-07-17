import { ballot } from "@/lib/queries";

export async function GET() {
  return Response.json({ jurisdiction: "Montgomery County, MD", offices: await ballot() });
}
