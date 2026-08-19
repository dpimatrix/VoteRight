import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { moderationQueue } from "@/lib/debates";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  if (!(await hasAdminAccess("moderation"))) return <AdminAccessDenied screen="moderation" />;
  const queue = await moderationQueue();
  return (
    <>
      <div className="pagetitle">Argument moderation queue</div>
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
