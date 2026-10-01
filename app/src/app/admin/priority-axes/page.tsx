import { currentAdmin, hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { listAxesForAdmin, topicsList } from "@/lib/priorityAxes";
import { AxisCard, groupAxesByTopic } from "@/components/admin/AxisCard";
import { PriorityAxesNav } from "@/components/admin/PriorityAxesNav";
import { ERROR_NOTE } from "@/components/admin/priorityAxesErrors";

export const dynamic = "force-dynamic";

// Admin console redesign (2026-10-01): this used to be the one and only
// priority-axes page -- resident wishes, hand-authoring a new axis, AND a
// flat "All axes" list (draft/in_review/published/retired all interleaved,
// grouped only by topic) all on one continuously-scrolling page. As axis
// count grew (14 -> 21 -> 31 across migrations 106/108/109) the handful
// that actually needed action got lost among dozens of already-published
// ones. Split into 4 routes (see PriorityAxesNav); THIS page is now the
// default landing page and shows ONLY what needs a human decision today --
// exactly what the /admin dashboard card's "N pending" count already means,
// so clicking that card now lands you on exactly what it counted. Wishes,
// new-axis authoring, and the published/retired archive moved to their own
// routes below.
export default async function AdminPriorityAxesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; topic?: string }>;
}) {
  if (!(await hasAdminAccess("priority_axes"))) return <AdminAccessDenied screen="priority_axes" />;
  const admin = await currentAdmin();
  const sp = await searchParams;
  // Unfiltered -- AxisCard's "superseded by" lookup (and the retire
  // dropdown, on the published page) needs every axis regardless of this
  // page's own topic/status filtering, same invariant the old single page
  // relied on.
  const axes = await listAxesForAdmin();
  const topics = await topicsList();

  const needsAttention = axes.filter((a) => a.status === "draft" || a.status === "in_review");
  const visible = sp.topic ? needsAttention.filter((a) => a.topicId === sp.topic) : needsAttention;
  const inReview = groupAxesByTopic(visible.filter((a) => a.status === "in_review"));
  const drafts = groupAxesByTopic(visible.filter((a) => a.status === "draft"));

  return (
    <>
      <div className="pagetitle">Priority topics &amp; axes</div>
      <p className="sub">
        The actual questions every candidate and every voter is measured against. Draft → a
        <em> different</em> admin reviews → publish. Once published, wording is locked (enforced
        in the database, not just this screen) — a rewording is always a new axis plus retiring
        the old one, never a silent edit of what candidates have already been coded against.
      </p>
      <PriorityAxesNav active="review" />
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

      <div className="grouph">
        Awaiting a second admin&apos;s review ({inReview.reduce((n, g) => n + g.axes.length, 0)})
        {sp.topic && ` — ${topics.find((t) => t.id === sp.topic)?.name ?? sp.topic}`}
      </div>
      {/* Plain GET links, not a <select onChange>, to stay consistent with
          this whole console's no-client-JS posture. */}
      <p className="sub" style={{ marginTop: 0, display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <a href="/admin/priority-axes" style={{ fontWeight: sp.topic ? "normal" : "bold" }}>
          All topics
        </a>
        {topics.map((t) => (
          <a key={t.id} href={`/admin/priority-axes?topic=${t.id}`} style={{ fontWeight: sp.topic === t.id ? "bold" : "normal" }}>
            {t.name}
          </a>
        ))}
      </p>
      {inReview.length === 0 && <p className="nopos">Nothing awaiting review{sp.topic ? " for this topic" : ""}.</p>}
      {inReview.map((group) => (
        <div key={group.topicName}>
          <p className="nopos" style={{ margin: "0.8rem 0 0.3rem", fontWeight: "bold" }}>{group.topicName}</p>
          {group.axes.map((a) => (
            <AxisCard key={a.id} axis={a} allAxes={axes} meAdmin={admin?.username ?? ""} />
          ))}
        </div>
      ))}

      <div className="grouph">Drafts ({drafts.reduce((n, g) => n + g.axes.length, 0)})</div>
      {drafts.length === 0 && <p className="nopos">No drafts{sp.topic ? " for this topic" : ""}.</p>}
      {drafts.map((group) => (
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
