import { hasAdminAccess } from "@/lib/adminAuth";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { adminJurisdictionDemandQueue, DEMAND_THRESHOLD } from "@/lib/jurisdictionDemand";

export const dynamic = "force-dynamic";

const ERROR_NOTE: Record<string, string> = {
  not_configured: "AI research isn't set up on this deployment yet (no ANTHROPIC_API_KEY) — ask whoever runs the server to add one.",
  empty_response: "The model returned nothing usable — try again, or research this one by hand.",
  error: "Research request failed — see the server log for detail.",
};

export default async function JurisdictionDemandPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (!(await hasAdminAccess("jurisdiction_demand"))) return <AdminAccessDenied screen="jurisdiction_demand" />;
  const sp = await searchParams;
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
      <p className="sub">
        &quot;Research this jurisdiction&quot; (2026-10-01) asks an AI with live web search for this county&apos;s
        (and its named places&apos;) election-day schedule and office structure — a starting point for your own
        research, not a verified fact. <strong>Always check the actual source links before relying on anything in
        the note below</strong> — this project has repeatedly found an AI&apos;s own summary of a page to be wrong
        in ways only checking the real source catches.
      </p>
      {sp.e && <p className="nopos" style={{ color: "var(--adv, #b00)" }}>{ERROR_NOTE[sp.e] ?? sp.e}</p>}

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

          {q.research && (
            <div className="card raised" style={{ marginTop: "0.5rem" }}>
              <p className="nopos" style={{ margin: 0, fontStyle: "italic" }}>
                AI-drafted from web search — not verified. Check each source before relying on this.
              </p>
              <p style={{ fontSize: "0.88rem", margin: "0.4rem 0 0", whiteSpace: "pre-wrap" }}>{q.research.note}</p>
              {q.research.sourceUrls.length > 0 && (
                <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem", fontSize: "0.82rem" }}>
                  {q.research.sourceUrls.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.title ?? s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="nopos" style={{ margin: "0.4rem 0 0" }}>
                Requested by {q.research.requestedByAdmin} · {new Date(q.research.createdAt).toLocaleString("en-US")} ·{" "}
                {q.research.modelVersion}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <form method="post" action="/api/admin/jurisdiction-demand/research">
              <input type="hidden" name="state_fips" value={q.stateFips} />
              <input type="hidden" name="county_fips" value={q.countyFips} />
              <input type="hidden" name="place_names" value={q.placeNames.join(",")} />
              <button className="btn secondary" type="submit">
                {q.research ? "Research again" : "Research this jurisdiction"}
              </button>
            </form>
            <form method="post" action="/api/admin/jurisdiction-demand">
              <input type="hidden" name="state_fips" value={q.stateFips} />
              <input type="hidden" name="county_fips" value={q.countyFips} />
              <button className="btn" type="submit">
                Mark as provisioned
              </button>
            </form>
          </div>
        </div>
      ))}
    </>
  );
}
