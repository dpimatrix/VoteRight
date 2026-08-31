import { redirectTo } from "@/lib/redirect";
import { hasAdminAccess } from "@/lib/adminAuth";
import {
  certifyReferendum,
  closeReferendumNow,
  publishMandate,
  redactReferendumIdentities,
} from "@/lib/referenda";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("mandates"))) return new Response("forbidden", { status: 403 });
  const { id } = await params; // referendum id, or mandate id for action=publish
  const form = await request.formData();
  const action = String(form.get("action") ?? "");

  // Real gap found live 2026-08-31: every one of these four calls returns a
  // real, meaningful result (a rejection reason, or a redaction count) that
  // used to be discarded outright -- the admin was always redirected back to
  // a bare "/admin/mandates" regardless of outcome, with zero indication a
  // certify/publish/redact call had actually failed. This is the exact same
  // "silent no-op" class of gap already fixed this session for agree/ctq/
  // report/second (a TOCTOU race between page load and submit -- e.g.
  // meets_publish_threshold flipping between another admin's recertify and
  // this publish click), just never extended to these admin-only actions.
  // Worth calling out specifically: a silently-failed "redact" is a real
  // §10.1 privacy gap, not just a UX one -- an admin could believe a
  // referendum's identities were severed from its ballot tokens when they
  // never actually were, with nothing on screen to contradict that belief.
  let error: string | null = null;
  if (action === "close") {
    await closeReferendumNow(id);
  } else if (action === "certify") {
    const res = await certifyReferendum(
      id,
      String(form.get("office_id") ?? ""),
      String(form.get("summary") ?? ""),
      Number(form.get("threshold_pct") ?? 1.0),
    );
    if (!res.ok) error = res.reason;
  } else if (action === "publish") {
    const res = await publishMandate(id);
    if (res !== "ok") error = res;
  } else if (action === "redact") {
    const res = await redactReferendumIdentities(id);
    if (res === "not_published") error = res;
  } else {
    return new Response("unknown action", { status: 400 });
  }
  return redirectTo(`/admin/mandates${error ? `?e=${error}` : ""}`, request);
}
