import { verifiedUserId } from "@/lib/anon";
import { chargeAuthorizeNetToken } from "@/lib/paymentVerification";

export async function POST(request: Request) {
  const userId = await verifiedUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });
  const body = (await request.json()) as { recordId?: string; dataDescriptor?: string; dataValue?: string };
  if (!body.recordId || !body.dataDescriptor || !body.dataValue) return Response.json({ error: "bad request" }, { status: 400 });
  const result = await chargeAuthorizeNetToken(body.recordId, userId, body.dataDescriptor, body.dataValue);
  return Response.json(result);
}
