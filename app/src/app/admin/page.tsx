import Link from "next/link";
import { currentAdmin } from "@/lib/adminAuth";
import { adminAnomalyQueue } from "@/lib/anomalyDetection";
import { pendingCoverageGaps } from "@/lib/coverage";
import { listAxesForAdmin } from "@/lib/priorityAxes";
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

// Per-screen (2026-08-19): every screen key from adminAuth.ts is checked
// individually below, hiding both the card AND the query behind it -- an
// admin who can't see e.g. privacy requests shouldn't have this page even
// running adminPrivacyQueue() on their behalf.
export default async function AdminHome() {
  const admin = await currentAdmin();
  if (!admin) return null;
  const has = (s: string) => admin.screens.has(s as never);

  return (
    <>
      <div className="pagetitle">Queues</div>
      {has("disputes") &&
        (await (async () => {
          const flags = await adminFlags();
          const open = flags.filter((f) => f.status === "open").length;
          return (
            <Link className="seat" href="/admin/disputes">
              <span className="seat-ic">IF</span>
              <span className="sname">
                Integrity disputes
                <span className="smeta">{open} open · {flags.length} total</span>
              </span>
              <span className={`chip band ${open > 0 ? "bm1" : "b0"}`}>{open} open</span>
            </Link>
          );
        })())}
      {has("coding") &&
        (await (async () => {
          const queue = await adminCodingQueue();
          return (
            <Link className="seat" href="/admin/coding">
              <span className="seat-ic">PC</span>
              <span className="sname">
                Position coding
                <span className="smeta">model suggestions awaiting human confirmation</span>
              </span>
              <span className={`chip band ${queue.length > 0 ? "b1" : "b0"}`}>{queue.length} pending</span>
            </Link>
          );
        })())}
      {has("moderation") &&
        (await (async () => {
          const mods = await moderationQueue();
          return (
            <Link className="seat" href="/admin/moderation">
              <span className="seat-ic">AM</span>
              <span className="sname">
                Argument moderation
                <span className="smeta">pre-publish review for debate arguments</span>
              </span>
              <span className={`chip band ${mods.length > 0 ? "bm1" : "b0"}`}>{mods.length} pending</span>
            </Link>
          );
        })())}
      {has("anomalies") &&
        (await (async () => {
          const anomalies = await adminAnomalyQueue();
          return (
            <Link className="seat" href="/admin/anomalies">
              <span className="seat-ic">AN</span>
              <span className="sname">
                Anomaly review
                <span className="smeta">Sybil/coordinated-manipulation flags (§9) — velocity &amp; geo checks</span>
              </span>
              <span className={`chip band ${anomalies.length > 0 ? "bm1" : "b0"}`}>{anomalies.length} pending</span>
            </Link>
          );
        })())}
      {has("payments") && (
        <Link className="seat" href="/admin/payments">
          <span className="seat-ic">$V</span>
          <span className="sname">
            Payment verification
            <span className="smeta">fee &amp; gateway setup, reconcile mailed checks — gates debate participation</span>
          </span>
          <span className="chip band b0">setup</span>
        </Link>
      )}
      {has("subscriptions") &&
        (await (async () => {
          const { adminSubscriptionCounts } = await import("@/lib/subscriptions");
          const counts = await adminSubscriptionCounts();
          const total = counts.supporter + counts.patron + counts.champion;
          return (
            <Link className="seat" href="/admin/subscriptions">
              <span className="seat-ic">$M</span>
              <span className="sname">
                Membership subscriptions
                <span className="smeta">§14 — recurring tiers, separate from payment_verified</span>
              </span>
              <span className="chip band b0">{total} subscribers</span>
            </Link>
          );
        })())}
      {has("mandates") &&
        (await (async () => {
          const pipeline = await adminMandatePipeline();
          const mandateWork =
            pipeline.ready.length +
            pipeline.referenda.filter((r: { status: string; certified: boolean }) => r.status === "closed" && !r.certified).length +
            pipeline.commitments.length;
          return (
            <Link className="seat" href="/admin/mandates">
              <span className="seat-ic">RM</span>
              <span className="sname">
                Referenda &amp; mandates
                <span className="smeta">schedule · certify · publish · commitments · outcomes · redaction</span>
              </span>
              <span className={`chip band ${mandateWork > 0 ? "b1" : "b0"}`}>{mandateWork} pending</span>
            </Link>
          );
        })())}
      {has("accountability") &&
        (await (async () => {
          const campaigns = await adminCampaigns();
          return (
            <Link className="seat" href="/admin/accountability">
              <span className="seat-ic">AC</span>
              <span className="sname">
                Accountability campaigns
                <span className="smeta">in-app status vs. real petition status — tracked separately</span>
              </span>
              <span className="chip band b0">{campaigns.length} total</span>
            </Link>
          );
        })())}
      {has("privacy") &&
        (await (async () => {
          const privacy = await adminPrivacyQueue();
          const privacyOpen = privacy.filter((p) => p.status === "received" || p.status === "in_progress").length;
          const privacyOverdue = privacy.some((p) => p.overdue);
          return (
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
          );
        })())}

      {has("positions") && (
        <Link className="seat" href="/admin/positions">
          <span className="seat-ic">VP</span>
          <span className="sname">
            Vote → position coding
            <span className="smeta">turn roll calls into scored, cited positions — one deliberate judgment at a time</span>
          </span>
          <span className="chip band b0">code</span>
        </Link>
      )}
      {has("transparency") && (
        <Link className="seat" href="/admin/transparency">
          <span className="seat-ic">$$</span>
          <span className="sname">
            Outside money &amp; endorsements
            <span className="smeta">MDCRIS filings + org announcements — curated, citation-required (§8.1)</span>
          </span>
          <span className="chip band b0">curate</span>
        </Link>
      )}
      {has("admin_accounts") && (
        <Link className="seat" href="/admin/admin-accounts">
          <span className="seat-ic">AA</span>
          <span className="sname">
            Admin accounts
            <span className="smeta">create admins, grant/revoke per-screen access</span>
          </span>
          <span className="chip band b0">manage</span>
        </Link>
      )}
      {has("race_coverage") &&
        (await (async () => {
          const gaps = await pendingCoverageGaps();
          const withViewers = gaps.filter((g) => g.viewerCount > 0).length;
          return (
            <Link className="seat" href="/admin/race-coverage">
              <span className="seat-ic">RC</span>
              <span className="sname">
                Race coverage
                <span className="smeta">elected offices with no races row this cycle — sourcing gaps, not code bugs</span>
              </span>
              <span className={`chip band ${withViewers > 0 ? "bm1" : gaps.length > 0 ? "b1" : "b0"}`}>
                {gaps.length} gap{gaps.length === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })())}
      {has("priority_axes") &&
        (await (async () => {
          const axes = await listAxesForAdmin();
          const needsAttention = axes.filter((a) => a.status === "in_review" || a.status === "draft").length;
          return (
            <Link className="seat" href="/admin/priority-axes">
              <span className="seat-ic">PA</span>
              <span className="sname">
                Priority topics &amp; axes
                <span className="smeta">the questions every candidate &amp; voter is measured against — draft → review → publish</span>
              </span>
              <span className={`chip band ${needsAttention > 0 ? "b1" : "b0"}`}>{needsAttention} pending</span>
            </Link>
          );
        })())}

      {await (async () => {
        // Read-only operational health, not a mutation screen -- shown to
        // any logged-in admin regardless of per-screen grants, same as the
        // rest of the layout chrome.
        const all = await ingestionFreshness();
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
