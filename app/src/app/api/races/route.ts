import { races } from "@/lib/queries";

export async function GET() {
  return Response.json({ races: await races() });
}
