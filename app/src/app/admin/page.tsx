import Link from "next/link";
import { isAdmin } from "@/lib/adminAuth";
import { adminAnomalyQueue } from "@/lib/anomalyDetection";
import { moderationQueue } from "@/lib/debates";
import { adminCodingQueue, adminFlags } from "@/lib/queries";
import { adminCampaigns } from "@/lib/accountability";
import { adminPrivacyQueue } from "@/lib/privacy";
import { ingestionFreshness, type IngestionFreshness } from "@/lib/queries";
import { adminMandatePipeline } from "@/lib/referenda";

export const dynamic = "force-dynamic";

// checkpoint-publish writes our own audit trail OUT (git push); everything
// else in ingestion_runs pulls external data IN. Same ledger, same health
// logic, but conflating "the county stopped publishing" with "our own
// tamper-evidence checkpoint stopped publishing" under one heading would
// hide that they need different people/fixes -- split the display, not the
// underlying query.
const PUBLISHING_SOURCES = new Set(["checkpoint-publish"]);

function FreshnessCard({ f }: { f: IngestionFreshness }) {
  return (
    <div className="card" style={{ padding: "0.6rem 0.9rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ flex: 1, fontSize: "0.9rem" }}>{f.source}</strong>
        <span className={`pill ${f.health === "fresh" ? "kept" : f.health === "failed" ? "broken" : "pending"}`}>
          {f.health === "fresh" ? "fresh" : f.health === "failed" ? "failed" : "stale"}
        </span>
      </div>
      <div className="cover" style={{ margin: "0.15rem 0 0" }}>
        last run {f.finished ?? "…"} ({f.status}) · data through {f.data_through ?? "n/a"} · +{f.rows_upserted} rows
      </div>
      {f.health === "stale" && f.status !== "failed" && (
        <p className="nopos" style={{ margin: "0.25rem 0 0" }}>
          No newer data seen in over {f.staleAfterDays} days — the run itself is succeeding, but the upstream
          source may have gone quiet. Worth a manual check.
        </p>
      )}
      {f.note && <p className="nopos" style={{ margin: "0.25rem 0 0" }}>{f.note}</p>}
    </div>
  );
}

export default async function AdminHome() {
  if (!(await isAdmin())) return null;
  const flags = await adminFlags();
  const queue = await adminCodingQueue();
  const mods = await moderationQueue();
  const anomalies = await adminAnomalyQueue();
  const pipeline = await adminMandatePipeline();
  const campaigns = await adminCampaigns();
  const privacy = await adminPrivacyQueue();
  const freshness = await ingestionFreshness();
  const privacyOpen = privacy.filter((p) => p.status === "received" || p.status === "in_progress").length;
  const privacyOverdue = privacy.some((p) => p.overdue);
  const mandateWork =
    pipeline.ready.length +
    pipeline.referenda.filter((r: { status: string; certified: boolean }) => r.status === "closed" && !r.certified).length +
    pipeline.commitments.length;
  const open = flags.filter((f) => f.status === "open").length;
  return (
    <>
      <div className="pagetitle">Queues</div>
      <Link className="seat" href="/admin/disputes">
        <span className="seat-ic">IF</span>
        <span className="sname">
          Integrity disputes
          <span className="smeta">{open} open · {flags.length} total</span>
        </span>
        <span className={`chip band ${open > 0 ? "bm1" : "b0"}`}>{open} open</span>
      </Link>
      <Link className="seat" href="/admin/coding">
        <span className="seat-ic">PC</span>
        <span className="sname">
          Position coding
          <span className="smeta">model suggestions awaiting human confirmation</span>
        </span>
        <span className={`chip band ${queue.length > 0 ? "b1" : "b0"}`}>{queue.length} pending</span>
      </Link>
      <Link className="seat" href="/admin/moderation">
        <span className="seat-ic">AM</span>
        <span className="sname">
          Argument moderation
          <span className="smeta">pre-publish review for debate arguments</span>
        </span>
        <span className={`chip band ${mods.length > 0 ? "bm1" : "b0"}`}>{mods.length} pending</span>
      </Link>
      <Link className="seat" href="/admin/anomalies">
        <span className="seat-ic">AN</span>
        <span className="sname">
          Anomaly review
          <span className="smeta">Sybil/coordinated-manipulation flags (§9) — velocity &amp; geo checks</span>
        </span>
        <span className={`chip band ${anomalies.length > 0 ? "bm1" : "b0"}`}>{anomalies.length} pending</span>
      </Link>
      <Link className="seat" href="/admin/mandates">
        <span className="seat-ic">RM</span>
        <span className="sname">
          Referenda &amp; mandates
          <span className="smeta">schedule · certify · publish · commitments · outcomes · redaction</span>
        </span>
        <span className={`chip band ${mandateWork > 0 ? "b1" : "b0"}`}>{mandateWork} pending</span>
      </Link>
      <Link className="seat" href="/admin/accountability">
        <span className="seat-ic">AC</span>
        <span className="sname">
          Accountability campaigns
          <span className="smeta">in-app status vs. real petition status — tracked separately</span>
        </span>
        <span className="chip band b0">{campaigns.length} total</span>
      </Link>
      <Link className="seat" href="/admin/privacy">
        <span className="seat-ic">PR</span>
        <span className="sname">
          Privacy requests (MODPA)
          <span className="smeta">45-day statutory clock · appeals 60 · deletion executes §10</span>
        </span>
        <span className={`chip band ${privacyOverdue ? "bm2" : privacyOpen > 0 ? "bm1" : "b0"}`}>
          {privacyOpen} open{privacyOverdue ? " · OVERDUE" : ""}
        </span>
      </Link>

      <Link className="seat" href="/admin/positions">
        <span className="seat-ic">VP</span>
        <span className="sname">
          Vote → position coding
          <span className="smeta">turn roll calls into scored, cited positions — one deliberate judgment at a time</span>
        </span>
        <span className="chip band b0">code</span>
      </Link>
      <Link className="seat" href="/admin/transparency">
        <span className="seat-ic">$$</span>
        <span className="sname">
          Outside money &amp; endorsements
          <span className="smeta">MDCRIS filings + org announcements — curated, citation-required (§8.1)</span>
        </span>
        <span className="chip band b0">curate</span>
      </Link>

      {(() => {
        const all = freshness;
        const feeds = all.filter((f) => !PUBLISHING_SOURCES.has(f.source));
        const publishing = all.filter((f) => PUBLISHING_SOURCES.has(f.source));
        return (
          <>
            <div className="grouph" style={{ marginTop: "1rem" }}>Data freshness (DATA-OPS §6)</div>
            {feeds.length === 0 && <p className="nopos">No ingestion runs recorded yet.</p>}
            {feeds.map((f) => (
              <FreshnessCard key={f.source} f={f} />
            ))}
            <div className="grouph" style={{ marginTop: "1rem" }}>Audit &amp; publishing jobs</div>
            {publishing.length === 0 && <p className="nopos">No publishing runs recorded yet.</p>}
            {publishing.map((f) => (
              <FreshnessCard key={f.source} f={f} />
            ))}
          </>
        );
      })()}
    </>
  );
}
