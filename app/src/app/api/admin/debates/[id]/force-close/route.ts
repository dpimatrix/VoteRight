import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { forceCloseThread } from "@/lib/debates";
import { redirectTo } from "@/lib/redirect";

/* Admin force-close (2026-08-24, migration 093) -- the human-moderator
   replacement for the removed vote-based "call the question". Lives under
   the existing "moderation" screen rather than a new screen key: this is
   the same kind of judgment call as approving/removing an individual
   argument, just scoped to a whole thread. :id is the thread id (not the
   proposal id -- forceCloseThread() operates on forum_threads directly). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminAccess("moderation"))) return new Response("forbidden", { status: 403 });
  const { id: threadId } = await params;
  const admin = await currentAdmin();
  const form = await request.formData();
  const reason = String(form.get("reason") ?? "").trim();
  // No error UI on this simple redirect-back form to surface a rejection to
  // -- same posture as the argument-moderation route right next to this one
  // -- but an unexplained early close has no audit trail, so this one case
  // is worth a hard stop rather than a silent no-op.
  if (!reason) return new Response("reason required", { status: 400 });
  await forceCloseThread(threadId, admin!.username, reason);
  return redirectTo("/admin/moderation", request);
}
