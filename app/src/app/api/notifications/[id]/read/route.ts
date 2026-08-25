import { currentUserId } from "@/lib/anon";
import { markRead } from "@/lib/notifications";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");
  if (userId) await markRead(id, userId);
  if (isJson) return Response.json({ ok: true });
  const form = await request.formData().catch(() => null);
  const lang = String(form?.get("lang") ?? "en");
  return redirectTo(`/notifications?lang=${lang}`, request);
}
