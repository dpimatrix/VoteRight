import { isAdmin } from "@/lib/adminAuth";
import { redirectTo } from "@/lib/redirect";
import { reconcileCheckPayment } from "@/lib/paymentVerification";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  // No per-admin identity exists yet (single shared TOTP login, see the
  // admin-roles backlog item) -- "admin" is an honest label for the current
  // model, not a placeholder standing in for a name this code just isn't
  // reading correctly.
  await reconcileCheckPayment(id, "admin");
  return redirectTo("/admin/payments", request);
}
