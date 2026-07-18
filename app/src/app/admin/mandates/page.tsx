import { isAdmin } from "@/lib/adminAuth";
import { adminMandatePipeline } from "@/lib/referenda";

export const dynamic = "force-dynamic";

interface RaceCand { candidacy_id: string; name: string; party: string | null; status: string }

export default async function AdminMandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!(await isAdmin())) return null;
  const { e } = await searchParams;
  const p = await adminMandatePipeline();

  return (
    <>
      <div className="pagetitle">Referendum &amp; mandate pipeline</div>
      <p className="sub">
        §7.3 loop: schedule → open → close → certify (turnout vs. registered voters) →
        publish (CHECK-gated by the turnout threshold) → §7.9 commitments → race outcome →
        promises. Identity redaction (§10.1) severs the token↔user link after publication.
      </p>
      {e === "cite" && (
        <p className="pill broken">✗ An attributed stance needs the candidate&apos;s own public statement as a citation (§2.3).</p>
      )}

      <div className="grouph">Ready to schedule (debate closed, question called)</div>
      {p.ready.length === 0 && <p className="nopos">None waiting.</p>}
      {p.ready.map((r: { id: string; title: string; topic: string }) => (
        <div className="card" key={r.id}>
          <strong style={{ fontSize: "0.92rem" }}>{r.title}</strong>
          <div className="cover" style={{ margin: "0.15rem 0 0.4rem" }}>{r.topic}</div>
          <form method="post" action="/api/admin/referenda" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <input type="hidden" name="proposal_id" value={r.id} />
            <input name="question" placeholder="Ballot question (neutral, yes/no answerable)" required />
            <div className="admform" style={{ marginTop: 0 }}>
              <label style={{ flex: 1, fontSize: "0.8rem" }}>Opens<input type="datetime-local" name="opens_at" required style={{ width: "100%" }} /></label>
              <label style={{ flex: 1, fontSize: "0.8rem" }}>Closes<input type="datetime-local" name="closes_at" required style={{ width: "100%" }} /></label>
            </div>
            <button type="submit">Schedule advisory referendum</button>
          </form>
        </div>
      ))}

      <div className="grouph">Referenda</div>
      {p.referenda.length === 0 && <p className="nopos">None yet.</p>}
      {p.referenda.map((r: {
        id: string; question_text: string; status: string; opens: string; closes: string;
        proposal_title: string; ballots: number; tokens: number; unredacted: number; certified: boolean;
      }) => (
        <div className="card" key={r.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, fontSize: "0.92rem" }}>{r.question_text}</strong>
            <span className={`chip band ${r.status === "open" ? "b1" : r.status === "published" ? "b2" : "b0"}`}>{r.status}</span>
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>
            {r.proposal_title} · {r.ballots} ballots / {r.tokens} tokens issued · closes {r.closes.slice(0, 16)}
          </div>
          <div className="admform">
            {(r.status === "open" || r.status === "scheduled") && (
              <form method="post" action={`/api/admin/referenda/${r.id}`} style={{ flex: 1, display: "flex" }}>
                <input type="hidden" name="action" value="close" />
                <button type="submit" style={{ width: "100%" }}>Close now</button>
              </form>
            )}
            {r.status !== "open" && r.status !== "scheduled" && r.unredacted > 0 && r.status === "published" && (
              <form method="post" action={`/api/admin/referenda/${r.id}`} style={{ flex: 1, display: "flex" }}>
                <input type="hidden" name="action" value="redact" />
                <button type="submit" style={{ width: "100%" }}>Redact identities ({r.unredacted} tokens) — §10.1</button>
              </form>
            )}
            {r.status === "published" && r.unredacted === 0 && (
              <span className="pill kept">✓ identities redacted — token↔user link severed</span>
            )}
          </div>
          {r.status === "closed" && !r.certified && (
            <form method="post" action={`/api/admin/referenda/${r.id}`} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
              <input type="hidden" name="action" value="certify" />
              <input name="summary" placeholder="Mandate summary (imperative: what voters asked for)" required />
              <div className="admform" style={{ marginTop: 0 }}>
                <label style={{ flex: 2, fontSize: "0.8rem" }}>
                  Office the mandate overlays
                  <select name="office_id" required style={{ width: "100%" }}>
                    {p.offices.map((o: { id: string; title: string }) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </label>
                <label style={{ flex: 1, fontSize: "0.8rem" }}>
                  Publish threshold %<input name="threshold_pct" type="number" step="0.1" defaultValue="1.0" style={{ width: "100%" }} />
                </label>
              </div>
              <button type="submit">Certify — tally &amp; record mandate (unpublished)</button>
            </form>
          )}
        </div>
      ))}

      <div className="grouph">Mandates</div>
      {p.mandates.length === 0 && <p className="nopos">None certified yet.</p>}
      {p.mandates.map((m: {
        id: string; mandate_summary: string; turnout_count: number; margin_pct: number;
        turnout_pct: number | null; threshold_pct: number; meets_publish_threshold: boolean;
        overlay_status: string; referendum_id: string; office: string | null; question_text: string;
      }) => (
        <div className="card" key={m.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, fontSize: "0.92rem" }}>{m.mandate_summary}</strong>
            <span className={`chip band ${m.overlay_status === "published" ? "b2" : "b0"}`}>{m.overlay_status}</span>
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>
            {m.office ?? "no office"} · turnout {m.turnout_count.toLocaleString()} ({m.turnout_pct ?? 0}% of registered,
            threshold {m.threshold_pct}%) · margin +{m.margin_pct}%
          </div>
          {m.overlay_status === "below_threshold_unpublished" && (
            m.meets_publish_threshold ? (
              <form method="post" action={`/api/admin/referenda/${m.id}`}>
                <input type="hidden" name="action" value="publish" />
                <button type="submit">Publish mandate + create §7.9 commitment rows</button>
              </form>
            ) : (
              // Same visible-CHECK pattern as the dispute console: the button exists,
              // the schema forbids the transition, and the operator sees why.
              <button disabled title="voter_mandates CHECK: publish requires meets_publish_threshold">
                Publish blocked — turnout {m.turnout_pct ?? 0}% &lt; {m.threshold_pct}% (schema CHECK)
              </button>
            )
          )}
        </div>
      ))}

      <div className="grouph">Commitments awaiting a candidate answer</div>
      {p.commitments.length === 0 && <p className="nopos">Every stance is recorded (or none exist yet).</p>}
      {p.commitments.map((c: { id: string; full_name: string; party: string | null; mandate_summary: string; office: string | null }) => (
        <div className="card" key={c.id}>
          <strong style={{ fontSize: "0.92rem" }}>{c.full_name}{c.party ? ` (${c.party})` : ""}</strong>
          <div className="cover" style={{ margin: "0.15rem 0 0.4rem" }}>{c.mandate_summary} · {c.office}</div>
          <form method="post" action={`/api/admin/commitments/${c.id}`} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div className="admform" style={{ marginTop: 0 }}>
              <select name="stance" required style={{ flex: 1 }}>
                <option value="commit">commit</option>
                <option value="decline">decline</option>
              </select>
              <input name="statement" placeholder="Candidate's own words" style={{ flex: 2 }} />
            </div>
            <div className="admform" style={{ marginTop: 0 }}>
              <input name="url" placeholder="Source URL (candidate's public statement — required)" required style={{ flex: 2 }} />
              <input name="title" placeholder="Source title" style={{ flex: 1 }} />
            </div>
            <button type="submit">Record answer on the record</button>
          </form>
        </div>
      ))}

      <div className="grouph">Race outcomes (spawns promises from winners&apos; commitments)</div>
      {p.races.length === 0 && <p className="nopos">No races carry mandate commitments yet.</p>}
      {p.races.map((ra: { id: string; office: string; cycle: string; seats_elected: number; candidacies: RaceCand[] }) => (
        <div className="card" key={ra.id}>
          <strong style={{ fontSize: "0.92rem" }}>{ra.office}</strong>
          <div className="cover" style={{ margin: "0.15rem 0 0.4rem" }}>{ra.cycle} · elects {ra.seats_elected}</div>
          <form method="post" action={`/api/admin/races/${ra.id}`} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {ra.candidacies.map((cd) => (
              <label key={cd.candidacy_id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.88rem" }}>
                <input type="checkbox" name="won" value={cd.candidacy_id} defaultChecked={cd.status === "won"} />
                {cd.name}{cd.party ? ` (${cd.party})` : ""}
                {cd.status !== "active" && <span className={`pill ${cd.status === "won" ? "kept" : "neutral"}`}>{cd.status}</span>}
              </label>
            ))}
            <button type="submit" style={{ marginTop: "0.3rem" }}>
              Record outcome — winners&apos; commits become tracked promises (§7.9)
            </button>
          </form>
        </div>
      ))}
    </>
  );
}
