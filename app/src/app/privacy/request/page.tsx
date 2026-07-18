import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { myRequests } from "@/lib/privacy";

export const dynamic = "force-dynamic";

export default async function PrivacyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const requests = userId ? await myRequests(userId) : [];
  const PILL: Record<string, string> = {
    received: "pending", in_progress: "pending", completed: "kept", denied: "broken",
  };

  return (
    <>
      <SiteHeader lang={lang} path="/privacy/request" />
      <div className="pagepad">
        <p style={{ margin: "0.6rem 0 0" }}>
          <Link href={`/privacy?lang=${lang}`}>← {d.priv_h}</Link>
        </p>
        <div className="pagetitle">{d.priv_request_h}</div>
        <p className="sub">{d.priv_request_p}</p>

        {sp.ok && <p className="pill kept">✓ {d.priv_request_ok}</p>}

        <div className="card">
          <form method="post" action="/api/privacy" style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <input type="hidden" name="lang" value={lang} />
            <select name="type" required>
              <option value="access">{d.priv_t_access}</option>
              <option value="correction">{d.priv_t_correction}</option>
              <option value="deletion">{d.priv_t_deletion}</option>
              <option value="portability">{d.priv_t_portability}</option>
            </select>
            <textarea name="details" rows={3} placeholder={d.priv_details_ph} />
            <input name="contact" placeholder={d.priv_contact_ph} />
            <button className="btn" type="submit">{d.priv_submit}</button>
          </form>
          <div className="privnote" style={{ marginBottom: 0 }}>
            <span className="dot" />
            <span>{d.priv_form_note}</span>
          </div>
        </div>

        {requests.length > 0 && (
          <>
            <div className="grouph">{d.priv_mine_h}</div>
            {requests.map((r) => (
              <div className="card" key={r.id}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ flex: 1, fontSize: "0.9rem" }}>
                    {(d as Record<string, unknown>)[`priv_t_${r.request_type}`] as string ?? r.request_type}
                  </strong>
                  <span className={`pill ${PILL[r.status] ?? "neutral"}`}>{r.status}</span>
                </div>
                <div className="cover" style={{ margin: "0.2rem 0" }}>
                  {r.received} · {d.priv_due} {r.due}
                </div>
                {r.resolution_note && <p className="nopos" style={{ margin: "0.25rem 0" }}>{r.resolution_note}</p>}
                {r.status === "denied" && r.request_type !== "appeal" && (
                  <form method="post" action="/api/privacy">
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="type" value="appeal" />
                    <input type="hidden" name="appeal_of" value={r.id} />
                    <button className="btn secondary" type="submit">{d.priv_appeal_btn}</button>
                  </form>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
