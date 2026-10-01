import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { listApprovedUndraftedPriorityWishes, listPendingPriorityWishes } from "@/lib/priorityWishes";
import { PriorityAxesNav } from "@/components/admin/PriorityAxesNav";
import { ERROR_NOTE } from "@/components/admin/priorityAxesErrors";

export const dynamic = "force-dynamic";

// Admin console redesign (2026-10-01): resident priority-wish triage, moved
// verbatim out of the old single priority-axes page -- deciding what to do
// with a suggestion is a different task from reviewing/publishing an
// already-drafted axis, so it gets its own route. See PriorityAxesNav for
// the other 3.
export default async function AdminPriorityWishesPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (!(await hasAdminAccess("priority_axes"))) return <AdminAccessDenied screen="priority_axes" />;
  const sp = await searchParams;
  const wishes = await listPendingPriorityWishes();
  const approvedUndrafted = await listApprovedUndraftedPriorityWishes();

  return (
    <>
      <div className="pagetitle">Priority topics &amp; axes</div>
      <PriorityAxesNav active="wishes" />
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

      <div className="grouph">Priority wishes ({wishes.length} pending)</div>
      <p className="sub" style={{ marginTop: 0 }}>
        Resident suggestions for a new priority axis. Approving here does NOT create a live axis
        automatically — draft the actual, balanced axis wording on the &quot;Draft new axis&quot; tab,
        using the wish as input. This just tells the submitter what happened to their suggestion.
      </p>
      {wishes.length === 0 && <p className="nopos">No pending wishes.</p>}
      {wishes.map((w) => (
        <div className="card" key={w.id} style={{ padding: "0.7rem 0.9rem" }}>
          <p style={{ fontSize: "0.9rem", margin: 0 }}>{w.statement}</p>
          <p className="nopos" style={{ margin: "0.3rem 0 0" }}>suggested {w.createdAt.slice(0, 10)}</p>
          <form
            method="post"
            action={`/api/admin/priority-wishes/${w.id}`}
            className="admform"
            style={{ marginTop: "0.5rem", alignItems: "flex-end" }}
          >
            <label style={{ flex: 1, fontSize: "0.8rem", width: "100%" }}>
              Note to submitter (optional — they&apos;ll see this either way)
              <input name="note" style={{ width: "100%" }} />
            </label>
            <button type="submit" name="action" value="approve">Approve</button>
            <button type="submit" name="action" value="reject" className="btn secondary">Reject</button>
          </form>
        </div>
      ))}

      {/* Real gap found live 2026-09-13: approving a wish above used to be
          the last anyone ever saw of it -- listPendingPriorityWishes()
          correctly drops it once decided, but nothing else picked it up,
          so "approved" and "actually built" silently diverged with no
          reminder. This is that reminder. */}
      <div className="grouph">Approved, not yet drafted ({approvedUndrafted.length})</div>
      <p className="sub" style={{ marginTop: 0 }}>
        Approved suggestions waiting on the actual axis wording. Stays here until a draft is
        linked to it — tracked (migration 104), not just a note to remember.
      </p>
      {approvedUndrafted.length === 0 && <p className="nopos">Nothing outstanding.</p>}
      {approvedUndrafted.map((w) => (
        <div className="card" key={w.id} style={{ padding: "0.7rem 0.9rem" }}>
          <p style={{ fontSize: "0.9rem", margin: 0 }}>{w.statement}</p>
          <p className="nopos" style={{ margin: "0.3rem 0 0" }}>
            approved {w.decidedAt?.slice(0, 10)}
            {w.adminNote ? ` · noted: "${w.adminNote}"` : ""}
          </p>
          <a
            className="btn secondary"
            style={{ marginTop: "0.5rem", display: "inline-block" }}
            href={`/admin/priority-axes/new?draft_from_wish=${w.id}&draft_text=${encodeURIComponent(w.statement)}`}
          >
            Draft axis from this →
          </a>
        </div>
      ))}
    </>
  );
}
