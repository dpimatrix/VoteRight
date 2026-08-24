import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { pendingCoverageGaps } from "@/lib/coverage";

export const dynamic = "force-dynamic";

export default async function AdminRaceCoveragePage() {
  if (!(await hasAdminAccess("race_coverage"))) return <AdminAccessDenied screen="race_coverage" />;
  const gaps = await pendingCoverageGaps();

  return (
    <>
      <div className="pagetitle">Race coverage</div>
      <p className="sub">
        Every elected office with no races row for the current cycle, in a jurisdiction where at
        least one resident is address_verified or better. This is detection only — it tells you
        what's missing, not who's running. Sourcing candidate-filing data is a per-jurisdiction
        human task (every state, often every county, runs its own election system); ranked by
        how many distinct verified residents have actually seen the seat as Pending on their own
        ballot, so effort goes where real people are waiting.
      </p>
      {gaps.length === 0 && <p className="nopos">No coverage gaps in any jurisdiction with a verified resident.</p>}
      {gaps.map((g) => (
        <div className="card" key={g.officeId} style={{ padding: "0.6rem 0.9rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <strong style={{ flex: 1, fontSize: "0.92rem" }}>{g.title}</strong>
            <span className={`chip band ${g.viewerCount > 0 ? "bm1" : "b0"}`}>
              {g.viewerCount} resident{g.viewerCount === 1 ? "" : "s"} waiting
            </span>
          </div>
          <div className="cover" style={{ margin: "0.15rem 0 0" }}>
            {g.jurisdictionName} · {g.level}
          </div>
        </div>
      ))}
    </>
  );
}
