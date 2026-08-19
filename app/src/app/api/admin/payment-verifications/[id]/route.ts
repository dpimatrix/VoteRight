import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { reconcileCheckPayment } from "@/lib/paymentVerification";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("payments"))) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const admin = await currentAdmin();
  await reconcileCheckPayment(id, admin?.username ?? "unknown");
  return redirectTo("/admin/payments", request);
}
