import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { adminJurisdictionDemandQueue, DEMAND_THRESHOLD } from "@/lib/jurisdictionDemand";

export const dynamic = "force-dynamic";

export default async function JurisdictionDemandPage() {
  if (!(await hasAdminAccess("jurisdiction_demand"))) return <AdminAccessDenied screen="jurisdiction_demand" />;
  const queue = await adminJurisdictionDemandQueue();

  return (
    <>
      <div className="pagetitle">Jurisdiction demand</div>
      <p className="sub">
        Demand-driven provisioning (2026-09-08): when a resident's address resolves to a real county VoteRight
        hasn&apos;t seeded local ballot detail for yet, that signal lands here — keyed to the Census state/county
        FIPS pair, never the resident&apos;s actual address, one signal per verified resident. At {DEMAND_THRESHOLD}{" "}
        signals an admin alert fires automatically. &quot;Looks provisioned&quot; means a real county-level
        jurisdiction row with at least one office now exists for that FIPS pair — it does NOT mean the data meets
        this project&apos;s own standards yet; review it yourself before clicking Mark as provisioned, which
        notifies every resident who signaled demand and clears this row.
      </p>

      {queue.length === 0 && <p className="nopos">No counties awaiting provisioning right now.</p>}
      {queue.map((q) => (
        <div className="card" key={`${q.stateFips}${q.countyFips}`}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong className="mono" style={{ flex: 1 }}>
              FIPS {q.stateFips}
              {q.countyFips}
            </strong>
            <span className={`chip band ${q.signalCount >= DEMAND_THRESHOLD ? "bm1" : "b0"}`}>
              {q.signalCount} signal{q.signalCount === 1 ? "" : "s"}
            </span>
            {q.looksProvisioned && <span className="chip band b0">looks provisioned</span>}
          </div>
          {q.placeNames.length > 0 && (
            <p className="nopos" style={{ margin: "0.3rem 0 0" }}>
              Places seen: {q.placeNames.join(", ")}
            </p>
          )}
          <p className="cover" style={{ margin: "0.2rem 0 0" }}>
            First signal: {new Date(q.firstSignalAt).toLocaleDateString("en-US")}
          </p>
          <form method="post" action="/api/admin/jurisdiction-demand" style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="state_fips" value={q.stateFips} />
            <input type="hidden" name="county_fips" value={q.countyFips} />
            <button className="btn" type="submit">
              Mark as provisioned
            </button>
          </form>
        </div>
      ))}
    </>
  );
}
