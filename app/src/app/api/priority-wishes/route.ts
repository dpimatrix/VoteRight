import { currentOrNewUserId, currentUserId } from "@/lib/anon";
import { listOwnPriorityWishes, submitPriorityWish } from "@/lib/priorityWishes";
import { redirectTo } from "@/lib/redirect";

/* Priority-Wishes voter endpoint (2026-09-03). No verification tier
   required -- same posture as setting priorities themselves (a per-
   session preference, not a civic act needing address/payment
   verification), just a real anon identity to attribute the suggestion
   to and notify back. Dual-mode (isJson) same as /api/verify -- the
   mobile client sends JSON, the plain server-rendered web form posts
   form-encoded and expects a redirect back, no client JS either way. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ wishes: [] });
  return Response.json({ wishes: await listOwnPriorityWishes(userId) });
}

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");

  if (isJson) {
    const userId = await currentUserId();
    if (!userId) return Response.json({ error: "no_session" }, { status: 403 });
    const b = (await request.json()) as { statement?: string };
    const res = await submitPriorityWish(userId, b.statement ?? "");
    if (!res.ok) return Response.json({ error: res.reason }, { status: 400 });
    return Response.json({ ok: true, id: res.id });
  }

  const userId = await currentOrNewUserId();
  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const res = await submitPriorityWish(userId, String(form.get("statement") ?? ""));
  return redirectTo(`/priorities?lang=${lang}${res.ok ? "&wishSent=1" : `&wishError=${res.reason}`}`, request);
}
