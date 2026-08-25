import { currentUserId } from "@/lib/anon";
import { clearNotificationEmail, setNotificationEmail } from "@/lib/notifications";
import { redirectTo } from "@/lib/redirect";

/* Sets (POST with an email) or clears (POST with an empty email) the
   opt-in notification email address. Always requires a session -- unlike
   the debate-action routes, this isn't gated on payment_verified: anyone
   with an anon identity can set up notification preferences ahead of ever
   participating in a debate. */
export async function POST(request: Request) {
  const userId = await currentUserId();
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");

  if (isJson) {
    if (!userId) return Response.json({ error: "verify" }, { status: 403 });
    const b = (await request.json()) as { email?: string };
    if (!b.email?.trim()) {
      await clearNotificationEmail(userId);
      return Response.json({ ok: true });
    }
    const res = await setNotificationEmail(userId, b.email.trim());
    if (!res.ok) return Response.json({ error: res.reason }, { status: 400 });
    return Response.json({ ok: true });
  }

  const form = await request.formData();
  const lang = String(form.get("lang") ?? "en");
  const email = String(form.get("email") ?? "").trim();
  if (userId) {
    if (email) await setNotificationEmail(userId, email);
    else await clearNotificationEmail(userId);
  }
  return redirectTo(`/notifications?lang=${lang}`, request);
}
