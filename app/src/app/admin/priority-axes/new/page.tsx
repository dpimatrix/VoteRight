import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { topicsList } from "@/lib/priorityAxes";
import { PriorityAxesNav } from "@/components/admin/PriorityAxesNav";
import { ERROR_NOTE } from "@/components/admin/priorityAxesErrors";

export const dynamic = "force-dynamic";

// Admin console redesign (2026-10-01): hand-authoring form, moved verbatim
// out of the old single priority-axes page. On save, the API route
// redirects to the review queue (/admin/priority-axes) where the new draft
// now appears -- direct confirmation it was created, not just a reload of
// this same form. On a validation error it redirects back here instead.
export default async function AdminNewAxisPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; draft_from_wish?: string; draft_text?: string }>;
}) {
  if (!(await hasAdminAccess("priority_axes"))) return <AdminAccessDenied screen="priority_axes" />;
  const sp = await searchParams;
  const topics = await topicsList();

  return (
    <>
      <div className="pagetitle">Priority topics &amp; axes</div>
      <PriorityAxesNav active="new" />
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

      <div className="grouph">Draft a new axis</div>
      <div className="card">
        <form method="post" action="/api/admin/priority-axes" className="admform">
          {sp.draft_from_wish && (
            <>
              <input type="hidden" name="wish_id" value={sp.draft_from_wish} />
              <p className="nopos" style={{ width: "100%", margin: 0 }}>
                Drafting from an approved resident suggestion — linked automatically on save.
              </p>
            </>
          )}
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
            <textarea
              name="question"
              rows={2}
              required
              defaultValue={sp.draft_text ?? ""}
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Negative pole (−2) — what the low end means, in words
            <input name="negative_pole" required style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Positive pole (+2) — what the high end means, in words
            <input name="positive_pole" required style={{ width: "100%" }} />
          </label>
          <label style={{ flex: 1, fontSize: "0.8rem" }}>
            Jurisdiction scope (migration 105) — leave blank for nationwide (shown to every resident); or a
            jurisdiction&apos;s ocd_id (e.g. ocd-division/country:us/state:md/county:montgomery) to scope this
            axis to residents whose own jurisdiction includes it
            <input name="jurisdiction_id" placeholder="blank = nationwide" style={{ width: "100%" }} />
          </label>
          <button type="submit">Save as draft</button>
        </form>
      </div>
    </>
  );
}
