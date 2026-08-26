import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { adminAnomalyQueue } from "@/lib/anomalyDetection";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  address_verification: "Address verification",
  second: "Seconding a proposal",
  call_the_question: "Calling the question",
  thread_report: "Reporting a debate thread",
  referendum_ballot: "Referendum ballot issuance",
};
const REASON_LABEL: Record<string, string> = {
  ip_velocity: "Unusual velocity",
  geo_mismatch: "Geographic mismatch",
};

export default async function AnomaliesPage() {
  if (!(await hasAdminAccess("anomalies"))) return <AdminAccessDenied screen="anomalies" />;
  const queue = await adminAnomalyQueue();
  return (
    <>
      <div className="pagetitle">Anomaly review queue</div>
      <p className="sub">
        Sybil/coordinated-manipulation detection (ARCHITECTURE.md §9) — flags, never blocks. A shared IP (a
        campus, a library, an office) can legitimately produce many real distinct residents in a short window;
        only a reviewer with context can tell that apart from a script. This is a visibility layer over
        today's self-attested verification, not a replacement for the stronger identity tier ARCHITECTURE.md
        §13 item 9 still leaves open.
      </p>
      {queue.length === 0 && <p className="nopos">Queue is empty.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1 }}>{q.display_name}</strong>
            <span className={`chip band ${q.reason === "ip_velocity" ? "bm1" : "bm2"}`}>{REASON_LABEL[q.reason]}</span>
            <span className="cover">{q.date}</span>
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>{ACTION_LABEL[q.action_type] ?? q.action_type}</div>
          {q.detail && <p style={{ fontSize: "0.92rem" }}>{q.detail}</p>}
          <div className="admform">
            <form method="post" action={`/api/admin/anomalies/${q.id}`} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="action" value="dismissed" />
              <button type="submit" style={{ width: "100%" }}>Dismiss</button>
            </form>
            <form method="post" action={`/api/admin/anomalies/${q.id}`} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="action" value="user_flagged_for_review" />
              <button type="submit" style={{ width: "100%" }}>Flag user</button>
            </form>
          </div>
        </div>
      ))}
    </>
  );
}
