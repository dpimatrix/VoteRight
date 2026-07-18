import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";
import { referendumDetail } from "@/lib/referenda";

export const dynamic = "force-dynamic";

export default async function ReferendumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; e?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const ref = await referendumDetail(id, userId);
  if (!ref) notFound();
  const tier = userId ? await userTier(userId) : "unverified";
  const verified = tier !== "unverified";
  const OPT: Record<string, string> = { yes: d.choice_yes, no: d.choice_no };

  return (
    <>
      <SiteHeader lang={lang} path={`/referenda/${id}`} />
      <div className="pagepad">
        <p style={{ margin: "0.6rem 0 0" }}>
          <Link href={`/mandates?lang=${lang}`}>← {d.man_h}</Link>
        </p>
        <div className="pagetitle">{ref.question_text}</div>
        <p className="sub">{ref.topic} · {ref.proposal_title}</p>

        {/* §2.4: the DB-stored disclosure is rendered verbatim on every surface */}
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{lang === "es" ? d.man_advisory : ref.disclosure_text}</span>
        </div>

        <p style={{ fontSize: "0.92rem" }}>{ref.proposal_body}</p>
        <p>
          <Link href={`/debates/${ref.proposal_id}?lang=${lang}`}>→ {d.deb_ref_live}</Link>
        </p>

        {ref.status === "scheduled" && (
          <div className="card">
            <span className="cover">{d.ref_opens} {ref.opens} · {d.ref_closes} {ref.closes}</span>
          </div>
        )}

        {ref.status === "open" && (
          <div className="card">
            <div className="cover">
              {ref.ballots} {d.ref_turnout} · {d.ref_closes} {ref.closes}
            </div>
            <p className="nopos" style={{ margin: "0.35rem 0" }}>{d.ref_results_after}</p>
            {sp.e === "nel" && <p className="pill broken">{d.ref_not_eligible}</p>}
            {!verified ? (
              <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
            ) : ref.voted ? (
              <div className="privnote" style={{ marginBottom: 0 }}>
                <span className="dot" />
                <span>{d.ref_voted}</span>
              </div>
            ) : !ref.my_token ? (
              <>
                <form method="post" action={`/api/referenda/${id}/ballot`}>
                  <input type="hidden" name="lang" value={lang} />
                  <button className="btn" type="submit">{d.ref_get_ballot}</button>
                </form>
                <p className="nopos" style={{ margin: "0.4rem 0 0" }}>{d.ref_one}</p>
              </>
            ) : (
              <form method="post" action={`/api/referenda/${id}/vote`}>
                <input type="hidden" name="lang" value={lang} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", margin: "0.4rem 0" }}>
                  {ref.options.map((o: string) => (
                    <label key={o} className="card" style={{ margin: 0, padding: "0.65rem 0.9rem", display: "flex", gap: "0.6rem", alignItems: "center", cursor: "pointer" }}>
                      <input type="radio" name="choice" value={o} required />
                      <strong>{OPT[o] ?? o}</strong>
                    </label>
                  ))}
                </div>
                <button className="btn" type="submit">{d.ref_cast}</button>
              </form>
            )}
            <div className="privnote" style={{ marginBottom: 0 }}>
              <span className="dot" />
              <span>{d.ref_secret}</span>
            </div>
          </div>
        )}

        {(ref.status === "closed" || ref.status === "published") && ref.results && (
          <div className="card">
            <div className="grouph" style={{ margin: "0 0 0.4rem" }}>{d.ref_results_h}</div>
            {ref.results.counts.map((c: { choice: string; n: number }) => (
              <div key={c.choice} style={{ margin: "0.35rem 0" }}>
                <div className="cover">
                  {OPT[c.choice] ?? c.choice} · {c.n.toLocaleString()}
                  {ref.results!.total > 0 ? ` (${Math.round((c.n / ref.results!.total) * 1000) / 10}%)` : ""}
                </div>
                <div className="covbar" aria-hidden>
                  <i style={{ width: `${ref.results!.total > 0 ? (c.n / ref.results!.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            <p className="nopos" style={{ margin: "0.4rem 0 0" }}>
              {ref.results.total.toLocaleString()} {d.ref_turnout}
            </p>
            {ref.mandate_id && ref.overlay_status !== "below_threshold_unpublished" && (
              <Link className="btn secondary" href={`/mandates/${ref.mandate_id}?lang=${lang}`} style={{ marginTop: "0.5rem" }}>
                {d.man_commit_h} →
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
