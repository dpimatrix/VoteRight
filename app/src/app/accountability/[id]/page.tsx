import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { campaignDetail } from "@/lib/accountability";
import { currentUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const userId = await currentUserId();
  const c = await campaignDetail(id, userId);
  if (!c) notFound();
  const tier = userId ? await userTier(userId) : "unverified";
  const verified = tier !== "unverified";

  return (
    <>
      <SiteHeader lang={lang} path={`/accountability/${id}`} />
      <div className="pagepad">
        <p style={{ margin: "0.6rem 0 0" }}>
          <Link href={`/accountability?lang=${lang}`}>← {d.acct_h}</Link>
        </p>
        <div className="pagetitle">
          {c.target_type === "politician" ? c.politician_name : c.reform_title}
        </div>
        <p className="sub">
          {d.acct_mech}: {d.mech[c.mechanism_type as keyof typeof d.mech] ?? c.mechanism_type}
        </p>

        {/* §7.4: auto-generated disclosure, rendered verbatim */}
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{c.disclosure_text}</span>
        </div>

        <p style={{ fontSize: "0.92rem" }}>{c.description}</p>

        <div className="card">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <span className={`chip band ${c.is_binding ? "b2" : "b0"}`}>
              {c.is_binding ? d.acct_binding : d.acct_organizing}
            </span>
            <span className="chip cite">▣ {c.legal_citation}</span>
          </div>
          <p style={{ fontSize: "0.9rem", margin: "0.45rem 0 0" }}>{c.pathway_description}</p>
          {c.signature_requirement_note && (
            <p className="nopos" style={{ margin: "0.35rem 0 0" }}>
              {d.acct_sig_req}: {c.signature_requirement_note}
            </p>
          )}
        </div>

        <div className="card">
          <div className="cover">
            {c.support_count} {d.acct_supporters} · {c.date}
          </div>
          {c.mechanism_type === "charter_amendment_petition" && (
            <p className="nopos" style={{ margin: "0.3rem 0" }}>
              {d.acct_ext_status}: {d.ext[c.external_petition_status as keyof typeof d.ext] ?? c.external_petition_status}
            </p>
          )}
          {c.supported ? (
            <p className="pill kept" style={{ margin: "0.4rem 0 0" }}>{d.acct_supported}</p>
          ) : verified && c.status === "gathering_support" ? (
            <form method="post" action={`/api/accountability/${id}/support`}>
              <input type="hidden" name="lang" value={lang} />
              <button className="btn" type="submit">{d.acct_support}</button>
            </form>
          ) : !verified ? (
            <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
          ) : null}
          <div className="privnote" style={{ marginBottom: 0 }}>
            <span className="dot" style={{ background: "var(--adv)" }} />
            <span>{d.acct_support_pub} {d.acct_not_signature}</span>
          </div>
        </div>

        {c.politician_id && (
          <p>
            <Link href={`/candidates/${c.politician_id}?lang=${lang}`}>
              → {c.politician_name}
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
