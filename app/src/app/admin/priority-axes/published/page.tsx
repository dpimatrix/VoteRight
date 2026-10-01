import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { listAxesForAdmin, topicsList } from "@/lib/priorityAxes";
import { AxisCard, groupAxesByTopic } from "@/components/admin/AxisCard";
import { PriorityAxesNav } from "@/components/admin/PriorityAxesNav";
import { ERROR_NOTE } from "@/components/admin/priorityAxesErrors";

export const dynamic = "force-dynamic";

// Admin console redesign (2026-10-01): the "done" pile -- what's actually
// live for residents/candidates today, plus retired history. Split out of
// the old single priority-axes page so it stops burying the handful of
// draft/in_review axes that need a decision (see /admin/priority-axes,
// the new default landing page) among dozens of already-settled ones.
// Retire (with its superseded-by picker) lives here since it only acts on
// a published axis.
export default async function AdminPublishedAxesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; topic?: string }>;
}) {
  if (!(await hasAdminAccess("priority_axes"))) return <AdminAccessDenied screen="priority_axes" />;
  const admin = await currentAdmin();
  const sp = await searchParams;
  const axes = await listAxesForAdmin();
  const topics = await topicsList();

  const settled = axes.filter((a) => a.status === "published" || a.status === "retired");
  const visible = sp.topic ? settled.filter((a) => a.topicId === sp.topic) : settled;
  const groups = groupAxesByTopic(visible);

  return (
    <>
      <div className="pagetitle">Priority topics &amp; axes</div>
      <PriorityAxesNav active="published" />
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

      <div className="grouph">
        Published &amp; retired ({visible.length})
        {sp.topic && ` — ${topics.find((t) => t.id === sp.topic)?.name ?? sp.topic}`}
      </div>
      <p className="sub" style={{ marginTop: 0, display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <a href="/admin/priority-axes/published" style={{ fontWeight: sp.topic ? "normal" : "bold" }}>
          All topics
        </a>
        {topics.map((t) => (
          <a
            key={t.id}
            href={`/admin/priority-axes/published?topic=${t.id}`}
            style={{ fontWeight: sp.topic === t.id ? "bold" : "normal" }}
          >
            {t.name}
          </a>
        ))}
      </p>
      {visible.length === 0 && <p className="nopos">No published or retired axes{sp.topic ? " for this topic" : ""}.</p>}
      {groups.map((group) => (
        <div key={group.topicName}>
          <p className="nopos" style={{ margin: "0.8rem 0 0.3rem", fontWeight: "bold" }}>{group.topicName}</p>
          {group.axes.map((a) => (
            <AxisCard key={a.id} axis={a} allAxes={axes} meAdmin={admin?.username ?? ""} />
          ))}
        </div>
      ))}
    </>
  );
}
