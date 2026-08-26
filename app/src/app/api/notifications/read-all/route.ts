import { currentUserId } from "@/lib/anon";
import { markAllRead } from "@/lib/notifications";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request) {
  const userId = await currentUserId();
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  if (userId) await markAllRead(userId);
  if (isJson) return Response.json({ ok: true });
  const form = await request.formData().catch(() => null);
  const lang = String(form?.get("lang") ?? "en");
  return redirectTo(`/notifications?lang=${lang}`, request);
}
