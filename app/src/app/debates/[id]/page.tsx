import Link from "next/link";
import { notFound } from "next/navigation";
import { DebateComposer } from "@/components/DebateComposer";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { debateDetail, userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface Arg {
  id: string; side: string; body_text: string; moderation_status: string; date: string;
  agree_count: number; disagree_count: number; pass_count: number;
  display_name: string; mine: boolean;
  citations: { publisher: string; title: string }[];
  my_vote: string | null;
}

export default async function DebatePage({
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
  const detail = await debateDetail(id, userId);
  if (!detail) notFound();
  const tier = userId ? await userTier(userId) : "unverified";
  const verified = tier !== "unverified";
  const back = `/debates/${id}`;

  const SIDE_LABEL: Record<string, string> = {
    for: d.side_for, against: d.side_against, neutral_info: d.side_neutral,
  };
  const SIDE_CLASS: Record<string, string> = { for: "b1", against: "bm1", neutral_info: "b0" };

  return (
    <>
      <SiteHeader lang={lang} path={`/debates/${id}`} />
      <div className="pagepad">
        <p style={{ margin: "0.6rem 0 0" }}>
          <Link href={`/debates?lang=${lang}`}>← {d.deb_h}</Link>
        </p>
        <div className="pagetitle">{detail.title}</div>
        <p className="sub">{detail.topic}</p>
        <p style={{ fontSize: "0.92rem" }}>{detail.body}</p>

        {detail.status === "seconding" && (
          <div className="card">
            <span className="chip band b1">
              {detail.seconds}/{detail.second_threshold} {d.deb_seconds}
            </span>
            {verified && !detail.has_seconded ? (
              <form method="post" action={`/api/debates/${id}/second`} style={{ marginTop: "0.6rem" }}>
                <input type="hidden" name="lang" value={lang} />
                <button className="btn" type="submit">{d.deb_second_btn}</button>
              </form>
            ) : detail.has_seconded ? (
              <p className="pill kept" style={{ marginTop: "0.6rem" }}>{d.deb_seconded}</p>
            ) : (
              <Link className="btn secondary" style={{ marginTop: "0.6rem" }} href={`/verify?lang=${lang}`}>
                {d.verify_need}
              </Link>
            )}
            <div className="privnote" style={{ marginBottom: 0 }}>
              <span className="dot" style={{ background: "var(--adv)" }} />
              <span>{d.deb_second_pub}</span>
            </div>
          </div>
        )}

        {detail.status === "referendum" && (
          <div className="disclosure">
            <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
            <span>{d.deb_await_ref}</span>
          </div>
        )}

        {detail.thread_id && detail.ctq && (
          <>
            {detail.thread_status === "open" && (
              <div className="card">
                <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.02rem" }}>{d.ctq_h}</div>
                <div className="cover">
                  {detail.ctq.votes} / {detail.ctq.active} {d.of_active} · {d.deb_closes} {detail.closes}
                </div>
                <div className="covbar" aria-hidden>
                  <i style={{ width: `${Math.min(100, (detail.ctq.votes / Math.max(1, detail.ctq.active)) / (detail.ctq_pct / 100) * 100)}%` }} />
                </div>
                <p className="nopos" style={{ margin: "0.35rem 0" }}>{d.ctq_note}</p>
                {detail.ctq.voted ? (
                  <div className="privnote" style={{ marginBottom: 0 }}><span className="dot" /><span>{d.ctq_voted}</span></div>
                ) : detail.ctq.eligible && verified ? (
                  <form method="post" action={`/api/debates/${detail.thread_id}/ctq`}>
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="back" value={back} />
                    <button className="btn secondary" type="submit">{d.ctq_btn}</button>
                  </form>
                ) : (
                  <p className="nopos" style={{ margin: 0 }}>{d.ctq_inelig}</p>
                )}
              </div>
            )}
            {detail.thread_status !== "open" && detail.status !== "referendum" && (
              <p className="nopos">{d.deb_thread_closed}</p>
            )}

            {(detail.args as Arg[]).map((a) => (
              <div className="card" key={a.id} style={a.moderation_status === "pending" ? { borderStyle: "dashed" } : undefined}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                  <span className={`chip band ${SIDE_CLASS[a.side]}`}>{SIDE_LABEL[a.side]}</span>
                  <strong style={{ fontSize: "0.86rem" }}>{a.display_name}</strong>
                  <span className="cover">{a.date}</span>
                </div>
                <p style={{ fontSize: "0.92rem", margin: "0.45rem 0" }}>{a.body_text}</p>
                {a.citations.length > 0 && (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                    {a.citations.map((c, i) => (
                      <span key={i} className="chip cite">▣ {c.publisher} · {c.title}</span>
                    ))}
                  </div>
                )}
                {a.moderation_status === "pending" ? (
                  <span className="pill pending">⟳ {d.pending_mod}</span>
                ) : detail.thread_status === "open" && verified ? (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                    {(["agree", "disagree", "pass"] as const).map((r) => (
                      <form key={r} method="post" action={`/api/arguments/${a.id}/agree`}>
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="back" value={back} />
                        <input type="hidden" name="response" value={r} />
                        <button
                          type="submit"
                          className={`chip band ${a.my_vote === r ? "b1" : "b0"}`}
                          style={{ cursor: "pointer" }}
                        >
                          {r === "agree" ? d.agree : r === "disagree" ? d.disagree : d.pass_b}
                          {r === "agree" ? ` ${a.agree_count}` : r === "disagree" ? ` ${a.disagree_count}` : ""}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : (
                  <span className="cover">
                    {d.agree} {a.agree_count} · {d.disagree} {a.disagree_count}
                  </span>
                )}
              </div>
            ))}
            {(detail.args as Arg[]).length > 0 && (
              <p className="nopos">{d.agr_priv}</p>
            )}

            {detail.thread_status === "open" &&
              (verified ? (
                <DebateComposer
                  threadId={detail.thread_id}
                  proposalId={id}
                  d={{
                    comp_h: d.comp_h, comp_side: d.comp_side, comp_body_ph: d.comp_body_ph,
                    comp_cite_ph: d.comp_cite_ph, comp_post: d.comp_post, comp_pub: d.comp_pub,
                    claim_q: d.claim_q, claim_add: d.claim_add, claim_op: d.claim_op,
                    claim_dismiss: d.claim_dismiss, side_for: d.side_for,
                    side_against: d.side_against, side_neutral: d.side_neutral,
                    pending_mod: d.pending_mod,
                  }}
                />
              ) : (
                <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
              ))}
          </>
        )}
      </div>
    </>
  );
}
