import { redirectTo } from "@/lib/redirect";
import { verifiedUserId } from "@/lib/anon";
import { submitCheckPayment } from "@/lib/paymentVerification";

export async function POST(request: Request) {
  const userId = await verifiedUserId();
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  if (!userId) return redirectTo(`/verify?lang=${lang}`, request);
  const { referenceCode } = await submitCheckPayment(userId);
  return redirectTo(`/verify/payment?lang=${lang}&checkCode=${referenceCode}`, request);
}
