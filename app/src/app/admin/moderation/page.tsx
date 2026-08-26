import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { moderationQueue, reportedThreadsQueue } from "@/lib/debates";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  if (!(await hasAdminAccess("moderation"))) return <AdminAccessDenied screen="moderation" />;
  const [queue, reported] = await Promise.all([moderationQueue(), reportedThreadsQueue()]);
  return (
    <>
      <div className="pagetitle">Reported debate threads</div>
      <p className="sub">
        Member reports of thread-level abuse (2026-08-24) — your own judgment
        call, below, for cases (spam, harassment) that aren&apos;t about debate
        being &quot;settled&quot; at all. This is separate from, not a replacement
        for, participant-vote &quot;call the question&quot;: that mechanism is back
        (2026-08-24) with two real floors — a minimum number of active
        participants and a minimum time open — so a thread can also close early
        on its own participants&apos; supermajority without any report or action
        from you here.
      </p>
      {reported.length === 0 && <p className="nopos">No open thread has an outstanding report.</p>}
      {reported.map((r) => (
        <div className="card" key={r.thread_id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1 }}>{r.proposal}</strong>
            <span className="chip band bm1">{r.report_count} report{r.report_count === 1 ? "" : "s"}</span>
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>
            Open {r.opened} · closes {r.closes} ·{" "}
            <a href={`/debates/${r.proposal_id}`} target="_blank" rel="noreferrer">view thread ↗</a>
          </div>
          {r.reasons.map((reason, i) => (
            <p key={i} className="nopos" style={{ margin: "0.2rem 0" }}>“{reason}”</p>
          ))}
          <form method="post" action={`/api/admin/debates/${r.thread_id}/force-close`} className="admform" style={{ marginTop: "0.5rem" }}>
            <input
              type="text"
              name="reason"
              placeholder="Reason for closing this thread early (required, shown in the audit trail)"
              required
              style={{ flex: 1 }}
            />
            <button type="submit" style={{ flexShrink: 0 }}>Force-close thread</button>
          </form>
        </div>
      ))}

      <div className="pagetitle" style={{ marginTop: "1.5rem" }}>Argument moderation queue</div>
      <p className="sub">
        Pre-publish review (§9): toxicity/spam screen stands in as human review at pilot
        scale. Claim-flag responses ride along so reviewers see how the author answered
        the citation prompt. Clustering-based lightweight review arrives with volume (§7.5).
      </p>
      {queue.length === 0 && <p className="nopos">Queue is empty.</p>}
      {queue.map((q) => (
        <div className="card" key={q.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1 }}>{q.display_name}</strong>
            <span className={`chip band ${q.side === "for" ? "b1" : q.side === "against" ? "bm1" : "b0"}`}>{q.side}</span>
            <span className="cover">{q.date}</span>
          </div>
          <div className="cover" style={{ margin: "0.2rem 0" }}>{q.proposal}</div>
          {q.format === "text" && <p style={{ fontSize: "0.92rem" }}>{q.body_text}</p>}
          {q.format === "video" && q.video_url && (
            <video controls preload="metadata" src={q.video_url} style={{ width: "100%", maxWidth: 480, borderRadius: 8 }} />
          )}
          {q.format === "audio" && q.audio_url && (
            <audio controls preload="metadata" src={q.audio_url} style={{ width: "100%" }} />
          )}
          {q.claim_text && (
            <p className="nopos" style={{ margin: "0.3rem 0" }}>
              Claim prompt: “{q.claim_text}” — author response: <strong>{q.claim_response}</strong>
            </p>
          )}
          <div className="admform">
            <form method="post" action={`/api/admin/moderation/${q.id}`} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="action" value="approved" />
              <button type="submit" style={{ width: "100%" }}>Approve</button>
            </form>
            <form method="post" action={`/api/admin/moderation/${q.id}`} style={{ flex: 1, display: "flex" }}>
              <input type="hidden" name="action" value="removed" />
              <button type="submit" style={{ width: "100%" }}>Remove</button>
            </form>
          </div>
        </div>
      ))}
    </>
  );
}
