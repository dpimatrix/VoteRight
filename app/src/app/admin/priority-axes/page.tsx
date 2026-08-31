import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { listAxesForAdmin, topicsList, type AdminAxis } from "@/lib/priorityAxes";

export const dynamic = "force-dynamic";

const ERROR_NOTE: Record<string, string> = {
  self_review: "Can't approve your own draft — a different admin has to review it.",
  not_in_review: "That axis isn't awaiting review (someone may have already acted on it).",
  not_found: "Axis not found.",
  race: "Someone else already acted on this axis.",
  // Real gap found live 2026-08-31: createDraftAxis() already returns one of
  // these 4 reasons on failure, but api/admin/priority-axes/route.ts (the
  // "draft a new axis" form's own action) discarded it outright, always
  // redirecting back here as if the save succeeded -- unlike every action
  // on THIS SAME PAGE below (approve/reject/retire/etc.), which already
  // correctly wired into this exact ERROR_NOTE lookup.
  topic: "Choose an existing topic or name a new one.",
  fields: "Every field (key, question, both poles) is required.",
  duplicate_key: "That axis key is already used within this topic — pick a different one.",
  error: "That axis couldn't be saved.",
};

function AxisCard({ axis, allAxes, meAdmin }: { axis: AdminAxis; allAxes: AdminAxis[]; meAdmin: string }) {
  return (
    <div className="card" style={{ padding: "0.7rem 0.9rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ flex: 1, fontSize: "0.9rem" }}>{axis.topicName} — {axis.key}</strong>
        <span
          className={`chip band ${
            axis.status === "published" ? "b2" : axis.status === "in_review" ? "b1" : axis.status === "retired" ? "bnull" : "b0"
          }`}
        >
          {axis.status}
        </span>
      </div>
      <p style={{ fontSize: "0.88rem", margin: "0.4rem 0 0" }}>{axis.question}</p>
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", margin: "0.3rem 0 0", flexWrap: "wrap" }}>
        <span className="chip cite">− {axis.negativePole}</span>
        <span className="chip cite">+ {axis.positivePole}</span>
      </div>
      <p className="nopos" style={{ margin: "0.35rem 0 0" }}>
        {axis.createdByAdmin ? `drafted by ${axis.createdByAdmin}` : "seeded, no admin attribution"}
        {axis.reviewedByAdmin ? ` · reviewed by ${axis.reviewedByAdmin}` : ""}
        {axis.publishedAt ? ` · published ${axis.publishedAt.slice(0, 10)}` : ""}
        {axis.retiredAt ? ` · retired ${axis.retiredAt.slice(0, 10)}` : ""}
        {axis.supersededByAxisId
          ? ` · superseded by ${allAxes.find((a) => a.id === axis.supersededByAxisId)?.key ?? axis.supersededByAxisId}`
          : ""}
      </p>

      {axis.status === "draft" && (
        <>
          <form method="post" action={`/api/admin/priority-axes/${axis.id}`} className="admform" style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="action" value="update_draft" />
            <label style={{ flex: 1, fontSize: "0.8rem", width: "100%" }}>
              Question
              <textarea name="question" defaultValue={axis.question} rows={2} required style={{ width: "100%" }} />
            </label>
            <label style={{ flex: 1, fontSize: "0.8rem" }}>
              Negative pole (−2)
              <input name="negative_pole" defaultValue={axis.negativePole} required style={{ width: "100%" }} />
            </label>
            <label style={{ flex: 1, fontSize: "0.8rem" }}>
              Positive pole (+2)
              <input name="positive_pole" defaultValue={axis.positivePole} required style={{ width: "100%" }} />
            </label>
            <button type="submit">Save changes</button>
          </form>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            <form method="post" action={`/api/admin/priority-axes/${axis.id}`}>
              <input type="hidden" name="action" value="submit_for_review" />
              <button type="submit" className="btn secondary">Submit for review</button>
            </form>
            <form method="post" action={`/api/admin/priority-axes/${axis.id}`}>
              <input type="hidden" name="action" value="delete_draft" />
              <button type="submit" className="btn secondary">Delete draft</button>
            </form>
          </div>
        </>
      )}

      {axis.status === "in_review" && (
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {axis.createdByAdmin === meAdmin ? (
            <p className="nopos" style={{ margin: 0 }}>
              Awaiting a different admin's review — you drafted this one, you can't publish it.
            </p>
          ) : (
            <form method="post" action={`/api/admin/priority-axes/${axis.id}`}>
              <input type="hidden" name="action" value="approve_and_publish" />
              <button type="submit">Approve &amp; publish</button>
            </form>
          )}
          <form method="post" action={`/api/admin/priority-axes/${axis.id}`}>
            <input type="hidden" name="action" value="send_back_to_draft" />
            <button type="submit" className="btn secondary">Send back to draft</button>
          </form>
        </div>
      )}

      {axis.status === "published" && (
        <form
          method="post"
          action={`/api/admin/priority-axes/${axis.id}`}
          style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
        >
          <input type="hidden" name="action" value="retire" />
          <label style={{ fontSize: "0.8rem" }}>
            Superseded by (optional)
            <select name="superseded_by_axis_id" defaultValue="" style={{ marginLeft: "0.4rem" }}>
              <option value="">— none —</option>
              {allAxes
                .filter((a) => a.id !== axis.id && a.status !== "retired")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.topicName} — {a.key} ({a.status})
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className="btn secondary">Retire</button>
        </form>
      )}
    </div>
  );
}

export default async function AdminPriorityAxesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  if (!(await hasAdminAccess("priority_axes"))) return <AdminAccessDenied screen="priority_axes" />;
  const admin = await currentAdmin();
  const sp = await searchParams;
  const axes = await listAxesForAdmin();
  const topics = await topicsList();

  return (
    <>
      <div className="pagetitle">Priority topics &amp; axes</div>
      <p className="sub">
        The actual questions every candidate and every voter is measured against. Draft → a
        <em> different</em> admin reviews → publish. Once published, wording is locked (enforced
        in the database, not just this screen) — a rewording is always a new axis plus retiring
        the old one, never a silent edit of what candidates have already been coded against.
      </p>
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

      <div className="grouph">Draft a new axis</div>
      <div className="card">
        <form method="post" action="/api/admin/priority-axes" className="admform">
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Existing topic
            <select name="topic_id" style={{ width: "100%" }}>
              <option value="">— use new topic below instead —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            …or a new top-level topic
            <input name="new_topic_name" placeholder="e.g. Economic development" style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Axis key (short, unique within the topic — e.g. rent_stabilization)
            <input name="key" required style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Question, phrased neutrally
            <textarea name="question" rows={2} required style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Negative pole (−2) — what the low end means, in words
            <input name="negative_pole" required style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Positive pole (+2) — what the high end means, in words
            <input name="positive_pole" required style={{ width: "100%" }} />
          </label>
          <button type="submit">Save as draft</button>
        </form>
      </div>

      <div className="grouph">All axes</div>
      {axes.length === 0 && <p className="nopos">No axes.</p>}
      {axes.map((a) => (
        <AxisCard key={a.id} axis={a} allAxes={axes} meAdmin={admin?.username ?? ""} />
      ))}
    </>
  );
}
