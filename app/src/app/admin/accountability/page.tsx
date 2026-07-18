import { adminCampaigns } from "@/lib/accountability";
import { isAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const STATUSES = ["gathering_support", "threshold_met", "submitted_to_authority", "closed"];
const EXT = [
  "not_applicable", "not_started", "gathering_signatures",
  "submitted_to_board_of_elections", "certified", "on_ballot", "failed_certification",
];

export default async function AdminAccountabilityPage() {
  if (!(await isAdmin())) return null;
  const campaigns = await adminCampaigns();
  return (
    <>
      <div className="pagetitle">Accountability campaigns</div>
      <p className="sub">
        §7.4: in-app status (support pipeline) and external petition status (the real
        Board of Elections process) are tracked separately and must never be conflated.
        Disclosure text is generated at creation and is not editable here or anywhere.
      </p>
      {campaigns.length === 0 && <p className="nopos">No campaigns.</p>}
      {campaigns.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, fontSize: "0.92rem" }}>
              {c.target_type === "politician" ? c.politician_name : c.reform_title}
            </strong>
            <span className="chip band b0">{c.mechanism_type}</span>
            <span className="cover">{c.support_count} supporters</span>
          </div>
          <p style={{ fontSize: "0.9rem", margin: "0.35rem 0" }}>{c.description}</p>
          <form method="post" action={`/api/admin/accountability/${c.id}`} className="admform">
            <label style={{ flex: 1, fontSize: "0.8rem" }}>
              Status
              <select name="status" defaultValue={c.status} style={{ width: "100%" }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {c.mechanism_type === "charter_amendment_petition" && (
              <label style={{ flex: 1, fontSize: "0.8rem" }}>
                External petition
                <select name="external_petition_status" defaultValue={c.external_petition_status} style={{ width: "100%" }}>
                  {EXT.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            <button type="submit">Update</button>
          </form>
        </div>
      ))}
    </>
  );
}
