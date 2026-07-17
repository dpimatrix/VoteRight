import { evidenceForPoliticians, politicianProfile } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await politicianProfile(id);
  if (!profile) return Response.json({ error: "not found" }, { status: 404 });
  const evidence = (await evidenceForPoliticians([id]))[id] ?? {};
  return Response.json({ ...profile, evidence });
}
