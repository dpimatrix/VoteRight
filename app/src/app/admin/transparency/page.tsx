import { isAdmin } from "@/lib/adminAuth";
import { adminTransparencyData } from "@/lib/transparency";

export const dynamic = "force-dynamic";

const COMMITTEE_TYPES = ["super_pac", "slate_mailer_committee", "ballot_issue_committee", "party_committee", "other"];
const ORG_TYPES = ["union", "trade_association", "advocacy_group", "editorial_board", "party_organization", "elected_official", "other"];

export default async function AdminTransparencyPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  if (!(await isAdmin())) return null;
  const sp = await searchParams;
  const t = await adminTransparencyData();

  return (
    <>
      <div className="pagetitle">Outside money &amp; endorsements (§8.1)</div>
      <p className="sub">
        Admin-curated with a mandatory filing/announcement citation on every row — the
        source URL IS the claim. MDCRIS bulk automation is a documented seam
        (DATA-OPS D3); at county volume, curation beats a brittle scraper.
      </p>
      {sp.e && <p className="pill broken">✗ Missing required fields — committee/org, amount/candidacy, date, and source URL are required.</p>}
      {sp.ok && <p className="pill kept">✓ Recorded with its citation.</p>}

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.4rem" }}>Record an independent expenditure (from an MDCRIS filing)</div>
        <form method="post" action="/api/admin/transparency" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <input type="hidden" name="action" value="expenditure" />
          <div className="admform" style={{ marginTop: 0 }}>
            <input name="committee_name" placeholder="Committee name (as filed)" required style={{ flex: 2 }} />
            <select name="committee_type" style={{ flex: 1 }}>
              {COMMITTEE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admform" style={{ marginTop: 0 }}>
            <select name="benefits_politician_id" style={{ flex: 2 }}>
              <option value="">— candidate it targets (optional for ballot-issue spends) —</option>
              {t.politicians.map((p: { id: string; full_name: string }) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            <select name="direction" style={{ flex: 1 }}>
              <option value="supporting">supporting</option>
              <option value="opposing">opposing</option>
            </select>
          </div>
          <div className="admform" style={{ marginTop: 0 }}>
            <select name="race_id" style={{ flex: 2 }}>
              <option value="">— race (optional) —</option>
              {t.races.map((r: { id: string; title: string }) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <input name="amount_usd" type="number" step="0.01" min="0.01" placeholder="Amount USD" required style={{ flex: 1 }} />
            <input name="expenditure_date" type="date" required style={{ flex: 1 }} />
          </div>
          <input name="purpose" placeholder="Purpose (e.g., digital ads, mailers)" />
          <input name="filing_url" placeholder="MDCRIS filing URL (required — the filing is the citation)" required />
          <button type="submit">Record expenditure</button>
        </form>
      </div>

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.4rem" }}>Record an endorsement (from the organization&apos;s own announcement)</div>
        <form method="post" action="/api/admin/transparency" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <input type="hidden" name="action" value="endorsement" />
          <div className="admform" style={{ marginTop: 0 }}>
            <input name="org_name" placeholder="Organization name" required style={{ flex: 2 }} />
            <select name="org_type" style={{ flex: 1 }}>
              {ORG_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="admform" style={{ marginTop: 0 }}>
            <select name="candidacy_id" required style={{ flex: 2 }}>
              {t.candidacies.map((c: { id: string; full_name: string; party: string | null; office: string }) => (
                <option key={c.id} value={c.id}>{c.full_name}{c.party ? ` (${c.party})` : ""} — {c.office}</option>
              ))}
            </select>
            <input name="endorsed_at" type="date" style={{ flex: 1 }} />
          </div>
          <input name="source_url" placeholder="Announcement URL (required)" required />
          <button type="submit">Record endorsement</button>
        </form>
      </div>

      <div className="grouph">Recent entries</div>
      {t.recentExp.map((e: { committee: string; amount_usd: string; direction: string; politician: string | null; date: string; url: string }, i: number) => (
        <div className="card" key={`e${i}`} style={{ padding: "0.6rem 0.9rem" }}>
          <span style={{ fontSize: "0.88rem" }}>
            {e.committee} — ${Number(e.amount_usd).toLocaleString()} {e.direction} {e.politician ?? "(ballot issue)"} · {e.date}
          </span>{" "}
          <a className="chip cite" href={e.url} target="_blank" rel="noreferrer">▣ filing</a>
        </div>
      ))}
      {t.recentEnd.map((e: { organization: string; politician: string; date: string | null; url: string }, i: number) => (
        <div className="card" key={`n${i}`} style={{ padding: "0.6rem 0.9rem" }}>
          <span style={{ fontSize: "0.88rem" }}>{e.organization} endorsed {e.politician}{e.date ? ` · ${e.date}` : ""}</span>{" "}
          <a className="chip cite" href={e.url} target="_blank" rel="noreferrer">▣ announcement</a>
        </div>
      ))}
      {t.recentExp.length === 0 && t.recentEnd.length === 0 && <p className="nopos">Nothing recorded yet.</p>}
    </>
  );
}
