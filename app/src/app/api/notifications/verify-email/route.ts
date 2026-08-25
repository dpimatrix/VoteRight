import { confirmNotificationEmail } from "@/lib/notifications";
import { redirectTo } from "@/lib/redirect";

/* Clicked from the confirmation email itself -- deliberately doesn't touch
   the request's own session cookie. The token carries and signs its own
   userId (notifications.ts's verifyNotificationEmailToken), so this works
   from any browser/device the link is opened in, not just the one that
   originally set the address; unlike key recovery, it never re-points the
   CURRENT session at that identity -- confirming an email address isn't
   the same claim "I am this identity" that importing a signing-key backup
   is. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await confirmNotificationEmail(token);
  return redirectTo(`/notifications?emailVerified=${ok ? "1" : "0"}`, request);
}
