import { currentUserId } from "@/lib/anon";
import { listNotifications, notificationEmailStatus, unreadCount } from "@/lib/notifications";

/* Reading your own notification inbox needs only a session, not
   payment_verified -- past notifications should stay visible even if a
   user's payment tier later lapses (e.g. a refund), since they earned each
   one at the time it fired. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ notifications: [], unread: 0, email: null, emailVerified: false });
  const [notifications, unread, emailStatus] = await Promise.all([
    listNotifications(userId),
    unreadCount(userId),
    notificationEmailStatus(userId),
  ]);
  return Response.json({ notifications, unread, email: emailStatus.email, emailVerified: emailStatus.verified });
}
