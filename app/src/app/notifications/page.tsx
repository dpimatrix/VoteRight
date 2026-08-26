import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { listNotifications, notificationEmailStatus } from "@/lib/notifications";
import { langFrom, t, tf } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; emailVerified?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const [notifications, emailStatus] = userId
    ? await Promise.all([listNotifications(userId), notificationEmailStatus(userId)])
    : [[], { email: null, verified: false }];

  return (
    <>
      <SiteHeader lang={lang} path="/notifications" />
      <div className="pagepad">
        <div className="pagetitle">{d.notif_h}</div>

        <div className="card">
          <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.02rem" }}>{d.notif_email_h}</div>
          <p className="nopos" style={{ margin: "0.35rem 0" }}>{d.notif_email_note}</p>
          {emailStatus.email && emailStatus.verified ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span className="pill kept">{tf(d.notif_email_verified, { email: emailStatus.email })}</span>
              <form method="post" action="/api/notifications/email">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="email" value="" />
                <button className="btn secondary" type="submit">{d.notif_email_remove}</button>
              </form>
            </div>
          ) : emailStatus.email && !emailStatus.verified ? (
            <p className="nopos">{tf(d.notif_email_pending, { email: emailStatus.email })}</p>
          ) : null}
          <form method="post" action="/api/notifications/email" style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <input type="hidden" name="lang" value={lang} />
            <input type="email" name="email" placeholder={d.notif_email_ph} defaultValue={emailStatus.email ?? ""} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn" type="submit">{d.notif_email_save}</button>
          </form>
        </div>

        {notifications.length > 0 && (
          <form method="post" action="/api/notifications/read-all">
            <input type="hidden" name="lang" value={lang} />
            <button className="btn secondary" type="submit" style={{ marginTop: "0.5rem" }}>{d.notif_mark_all}</button>
          </form>
        )}

        {notifications.length === 0 && <p className="nopos" style={{ marginTop: "1rem" }}>{d.notif_empty}</p>}
        {notifications.map((n) => (
          <div className="card" key={n.id} style={{ opacity: n.read_at ? 0.7 : 1 }}>
            <p style={{ fontSize: "0.92rem", margin: 0 }}>
              {n.type === "thread_closed"
                ? tf(d.notif_thread_closed, { title: n.proposal_title ?? "" })
                : tf(d.notif_ctq_eligible, { title: n.proposal_title ?? "" })}
            </p>
            {n.detail && <p className="nopos" style={{ margin: "0.3rem 0 0" }}>{n.detail}</p>}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.4rem" }}>
              {n.proposal_id && (
                <Link className="cover" href={`/debates/${n.proposal_id}?lang=${lang}`}>
                  {d.ref_view} →
                </Link>
              )}
              <span className="cover">{new Date(n.created_at).toLocaleDateString(lang === "es" ? "es" : "en-US")}</span>
              {!n.read_at && (
                <form method="post" action={`/api/notifications/${n.id}/read`}>
                  <input type="hidden" name="lang" value={lang} />
                  <button className="cover" type="submit" style={{ border: "none", background: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                    {d.notif_mark_read}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
