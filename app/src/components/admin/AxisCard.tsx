import { type AdminAxis } from "@/lib/priorityAxes";

// Extracted from the old monolithic priority-axes/page.tsx (admin console
// redesign, 2026-10-01) so the review-queue and published/retired pages can
// both render axis cards without duplicating this JSX. Behavior unchanged.
export function AxisCard({ axis, allAxes, meAdmin }: { axis: AdminAxis; allAxes: AdminAxis[]; meAdmin: string }) {
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
        <span className="chip cite">{axis.jurisdictionId ? axis.jurisdictionName ?? axis.jurisdictionId : "Nationwide"}</span>
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
              Awaiting a different admin&apos;s review — you drafted this one, you can&apos;t publish it.
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

// Groups an already topic-sorted axis list into consecutive runs sharing a
// topic name -- relies on the caller's own ordering (listAxesForAdmin()
// orders topic-name-first) rather than re-sorting.
export function groupAxesByTopic(axes: AdminAxis[]): { topicName: string; axes: AdminAxis[] }[] {
  const groups: { topicName: string; axes: AdminAxis[] }[] = [];
  for (const a of axes) {
    const group = groups[groups.length - 1];
    if (group?.topicName === a.topicName) group.axes.push(a);
    else groups.push({ topicName: a.topicName, axes: [a] });
  }
  return groups;
}
