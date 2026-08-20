import { verifiedUserId } from "@/lib/anon";
import { getPublicPaymentConfig } from "@/lib/paymentVerification";

/* Public-safe payment config for a client that has no server-rendered page to
   read it from (mobile, 2026-08-19) -- see getPublicPaymentConfig()'s own
   allowlist comment for what this deliberately does and doesn't expose.
   Gated on verifiedUserId() (address_verified), matching the same
   precondition web's /verify/payment page itself enforces before showing
   anything -- not because the config is sensitive, but so an unverified
   caller gets the same "verify first" signal every other route in this
   family already gives. */
export async function GET() {
  const userId = await verifiedUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });
  const config = await getPublicPaymentConfig();
  return Response.json(config);
}
