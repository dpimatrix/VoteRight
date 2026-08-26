import { currentUserId } from "@/lib/anon";
import { registerPushToken } from "@/lib/notifications";

/* Mobile-only in practice (there's no equivalent web push wired up), but
   not gated to a native-client header -- registering a token this app
   never issued is harmless (Expo's push API will just fail on a garbage
   token when something eventually tries to send to it). */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "verify" }, { status: 403 });
  const b = (await request.json()) as { token?: string };
  if (!b.token?.trim()) return Response.json({ error: "invalid" }, { status: 400 });
  await registerPushToken(userId, b.token.trim());
  return Response.json({ ok: true });
}
