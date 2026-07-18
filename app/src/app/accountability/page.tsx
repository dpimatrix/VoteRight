import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { creatableTargets, listCampaigns } from "@/lib/accountability";
import { currentUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AccountabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const userId = await currentUserId();
  const tier = userId ? await userTier(userId) : "unverified";
  const verified = tier !== "unverified";
  const campaigns = await listCampaigns(userId);
  const { pathways, politicians } = await creatableTargets();
  const petitionPathway = pathways.find(
    (p: { mechanism_type: string }) => p.mechanism_type === "charter_amendment_petition",
  );
  const officePathways = pathways.filter(
    (p: { mechanism_type: string }) => p.mechanism_type !== "charter_amendment_petition",
  );

  return (
    <>
      <SiteHeader lang={lang} path="/accountability" />
      <div className="pagepad">
        <div className="pagetitle">{d.acct_h}</div>
        <p className="sub">{d.acct_sub}</p>
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{d.acct_not_signature}</span>
        </div>

        <div className="grouph">{d.acct_campaigns_h}</div>
        {campaigns.length === 0 && <p className="nopos">{d.acct_campaigns_none}</p>}
        {campaigns.map((c) => (
          <Link className="seat" key={c.id} href={`/accountability/${c.id}?lang=${lang}`}>
            <span className="seat-ic">{c.target_type === "politician" ? "◎" : "§"}</span>
            <span className="sname">
              {c.target_type === "politician" ? c.politician_name : c.reform_title}
              <span className="smeta">
                {d.mech[c.mechanism_type as keyof typeof d.mech] ?? c.mechanism_type} · {c.support_count} {d.acct_supporters}
              </span>
            </span>
            <span className={`chip band ${c.is_binding ? "b2" : "b0"}`}>
              {c.is_binding ? d.acct_binding : d.acct_organizing}
            </span>
          </Link>
        ))}

        {verified ? (
          <>
            <div className="grouph">{d.acct_start_h}</div>
            <div className="card">
              <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.02rem" }}>{d.acct_target_pol}</div>
              <form method="post" action="/api/accountability" style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="target_type" value="politician" />
                <select name="pathway_id" required>
                  {officePathways.map((p: { id: string; mechanism_type: string; office_title: string | null }) => (
                    <option key={p.id} value={p.id}>
                      {p.office_title ?? ""} — {d.mech[p.mechanism_type as keyof typeof d.mech] ?? p.mechanism_type}
                    </option>
                  ))}
                </select>
                <select name="politician_id" required>
                  {politicians.map((p: { id: string; full_name: string; party: string | null }) => (
                    <option key={p.id} value={p.id}>{p.full_name}{p.party ? ` (${p.party})` : ""}</option>
                  ))}
                </select>
                <textarea name="description" rows={3} placeholder={d.acct_desc_ph} required />
                <button className="btn" type="submit">{d.acct_submit}</button>
              </form>
            </div>
            {petitionPathway && (
              <div className="card">
                <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.02rem" }}>{d.acct_target_reform}</div>
                <form method="post" action="/api/accountability" style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="target_type" value="charter_or_law_change" />
                  <input type="hidden" name="pathway_id" value={(petitionPathway as { id: string }).id} />
                  <input name="reform_title" placeholder={d.acct_reform_ph} required />
                  <textarea name="description" rows={3} placeholder={d.acct_desc_ph} required />
                  <button className="btn" type="submit">{d.acct_submit}</button>
                </form>
              </div>
            )}
            <div className="privnote">
              <span className="dot" style={{ background: "var(--adv)" }} />
              <span>{d.acct_support_pub}</span>
            </div>
          </>
        ) : (
          <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
        )}
      </div>
    </>
  );
}
