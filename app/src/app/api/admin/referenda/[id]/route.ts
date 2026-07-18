import { isAdmin } from "@/lib/adminAuth";
import {
  certifyReferendum,
  closeReferendumNow,
  publishMandate,
  redactReferendumIdentities,
} from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params; // referendum id, or mandate id for action=publish
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  if (action === "close") {
    await closeReferendumNow(id);
  } else if (action === "certify") {
    await certifyReferendum(
      id,
      String(form.get("office_id") ?? ""),
      String(form.get("summary") ?? ""),
      Number(form.get("threshold_pct") ?? 1.0),
    );
  } else if (action === "publish") {
    await publishMandate(id);
  } else if (action === "redact") {
    await redactReferendumIdentities(id);
  } else {
    return new Response("unknown action", { status: 400 });
  }
  return Response.redirect(new URL("/admin/mandates", request.url), 303);
}
