import { isAdmin } from "@/lib/adminAuth";
import {
  adminAttachEvidence,
  adminFlagEvent,
  adminResolveFlag,
} from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  if (action === "evidence") {
    await adminAttachEvidence(
      id,
      String(form.get("url") ?? ""),
      String(form.get("title") ?? ""),
      String(form.get("publisher") ?? ""),
    );
  } else if (action === "reply_request") {
    await adminFlagEvent(id, "Right of reply sent to the campaign — 14-day window opens.");
  } else if (action === "reply") {
    await adminFlagEvent(id, `REPLY (right of reply): ${String(form.get("note") ?? "")}`);
  } else if (action === "uphold") {
    await adminResolveFlag(id, "upheld", "Resolved: UPHELD — published with evidence and any reply attached.");
  } else if (action === "dismiss") {
    await adminResolveFlag(id, "dismissed", "Resolved: DISMISSED — evidence and reply retained in the append-only record.");
  } else {
    return new Response("unknown action", { status: 400 });
  }
  return Response.redirect(new URL(`/admin/disputes/${id}`, request.url), 303);
}
