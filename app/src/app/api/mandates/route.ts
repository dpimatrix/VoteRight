import { currentUserId } from "@/lib/anon";
import { listMandates, listReferenda } from "@/lib/referenda";

export async function GET() {
  const userId = await currentUserId();
  const [referenda, mandates] = await Promise.all([listReferenda(userId), listMandates()]);
  return Response.json({ referenda, mandates });
}
