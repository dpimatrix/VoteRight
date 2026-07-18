import { isAdmin } from "@/lib/adminAuth";
import { adminPrivacyQueue } from "@/lib/privacy";

export const dynamic = "force-dynamic";

export default async function AdminPrivacyPage() {
  if (!(await isAdmin())) return null;
  const queue = await adminPrivacyQueue();
  return (
    <>
      <div className="pagetitle">Privacy request queue (MODPA)</div>
      <p className="sub">
        Statutory clock: 45 days per request (one 45-day extension allowed — if used, tell
        the requester and note it here), appeals 60 days. Deletion executes the §10
        pseudonymization; it cannot be undone. Response goes via the requester&apos;s
        volunteered contact, or is shown on their request page if none was given.
      </p>
      {queue.length === 0 && <p className="nopos">Queue is empty.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id} style={q.overdue ? { borderColor: "var(--bad, #A24A33)" } : undefined}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, fontSize: "0.92rem" }}>
              {q.request_type}{q.appeal_of ? " (appeal)" : ""} — {q.display_name}
            </strong>
            <span className={`pill ${q.status === "completed" ? "kept" : q.status === "denied" ? "broken" : "pending"}`}>
              {q.status}
            </span>
            {q.overdue && <span className="pill broken">OVERDUE</span>}
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>
            received {q.received} · due {q.due}
            {q.response_contact ? ` · reply to: ${q.response_contact}` : " · no contact given (respond on their request page)"}
            {q.already_deleted ? " · subject already deleted" : ""}
          </div>
          {q.details && <p style={{ fontSize: "0.9rem", margin: "0.3rem 0" }}>{q.details}</p>}
          {q.resolution_note && <p className="nopos" style={{ margin: "0.3rem 0" }}>{q.resolution_note}</p>}
          {(q.status === "received" || q.status === "in_progress") && (
            <>
              <form method="post" action={`/api/admin/privacy/${q.id}`} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <input name="note" placeholder="Resolution note (shown to the requester)" />
                <div className="admform" style={{ marginTop: 0 }}>
                  <button type="submit" name="action" value="in_progress" style={{ flex: 1 }}>In progress</button>
                  <button type="submit" name="action" value="completed" style={{ flex: 1 }}>Complete</button>
                  <button type="submit" name="action" value="denied" style={{ flex: 1 }}>Deny (appealable)</button>
                </div>
              </form>
              {q.request_type === "deletion" && !q.already_deleted && (
                <form method="post" action={`/api/admin/privacy/${q.id}`} style={{ marginTop: "0.4rem" }}>
                  <input type="hidden" name="action" value="execute_deletion" />
                  <input type="hidden" name="subject_user_id" value={q.subject_user_id} />
                  <button type="submit" style={{ width: "100%" }}>
                    Execute deletion — §10 pseudonymization (irreversible)
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}
