import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import {
  evidenceForPoliticians,
  loadPriorities,
  politicianProfile,
  promisesFor,
  publishedFlagsFor,
  topicsWithAxes,
} from "@/lib/queries";
import { commitmentsFor } from "@/lib/referenda";
import { agreement, axisValue } from "@/lib/scoring/engine";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SRC_LABEL: Record<string, { en: string; es: string }> = {
  voting_record_inferred: { en: "Recorded vote", es: "Voto registrado" },
  questionnaire: { en: "Questionnaire", es: "Cuestionario" },
  campaign_site: { en: "Campaign site", es: "Sitio de campaña" },
  debate_transcript: { en: "Debate transcript", es: "Transcripción de debate" },
  interview: { en: "Interview", es: "Entrevista" },
};
const BAND_KEY = (a: number | null) =>
  a === null ? "none" : (String(a) as "2" | "1" | "0" | "-1" | "-2");
const BAND_CLASS = (a: number | null) =>
  a === null ? "bnull" : ({ 2: "b2", 1: "b1", 0: "b0", "-1": "bm1", "-2": "bm2" } as Record<string, string>)[String(a)];

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);

  const profile = await politicianProfile(id);
  if (!profile) notFound();
  const evidence = (await evidenceForPoliticians([id]))[id] ?? {};
  const topics = await topicsWithAxes();
  const userId = await currentUserId();
  const priorities = userId ? await loadPriorities(userId) : [];
  const prioByAxis = new Map(priorities.map((p) => [p.axisId, p]));
  const asOf = new Date();
  const promises = await promisesFor(id);
  const flags = await publishedFlagsFor(id);
  const commitments = await commitmentsFor(id);
  const STANCE: Record<string, { label: string; cls: string; ic: string }> = {
    commit: { label: d.stance_commit, cls: "b2", ic: "✓" },
    decline: { label: d.stance_decline, cls: "bm2", ic: "✗" },
    no_response: { label: d.stance_none, cls: "bnull", ic: "—" },
  };
  const PILL: Record<string, string> = {
    kept: "kept", broken: "broken", in_progress: "pending", compromised: "pending",
    stalled: "neutral", pending: "neutral",
  };
  const ICON: Record<string, string> = {
    kept: "✓", broken: "✗", in_progress: "⟳", compromised: "◑", stalled: "⏸", pending: "…",
  };

  return (
    <>
      <SiteHeader lang={lang} path={`/candidates/${id}`} />
      <div className="pagepad">
      <div className="row1" style={{ alignItems: "center", marginTop: "0.9rem" }}>
        <span className="mono-av" aria-hidden>{profile.full_name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
        <span className="cname serif" style={{ fontSize: "1.4rem" }}>
          {profile.full_name}
        </span>
        <span className="cparty">({profile.party})</span>
        {profile.current_office && <span className="inc">{d.incumbent}</span>}
      </div>
      <div className="disclosure">
        <span className="tag">{lang === "es" ? "Muestra" : "Sample"}</span>
        <span>{d.sample}</span>
      </div>

      {topics.map((tp) => {
        const items = evidence[tp.axis_id] ?? [];
        const av = axisValue(items, asOf);
        const prio = prioByAxis.get(tp.axis_id);
        const a = prio ? agreement(av.value, prio.direction) : null;
        return (
          <div className="topicrow" key={tp.axis_id}>
            <div className="trhead">
              <span className="tn">{tp.name}</span>
              {prio && (
                <span className={`chip band ${BAND_CLASS(a)}`}>{d.band[BAND_KEY(a)]}</span>
              )}
            </div>
            {prio && (
              <div className="yours">
                {d.you_said} <q>{prio.statement}</q> · {d.weight[prio.weight]}
              </div>
            )}
            {items.length === 0 ? (
              <div className="nopos">{d.silence_row}</div>
            ) : (
              items.map((e, i) => (
                <div key={i}>
                  <div className="theirs">{e.statement}</div>
                  <span className="chip cite">
                    ▣ {SRC_LABEL[e.sourceType]?.[lang] ?? e.sourceType} · {e.title ?? e.publisher} ·{" "}
                    {e.date} {e.archived ? `· ${d.archived} ✓` : ""}
                  </span>
                </div>
              ))
            )}
            {av.conflict && <div className="evrow">{d.conflict}</div>}
          </div>
        );
      })}

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.promises_h}</div>
        {promises.length === 0 ? (
          <div className="nopos">{d.promises_none}</div>
        ) : (
          <>
            {promises.map((p) => (
              <div key={p.id} style={{ margin: "0.6rem 0", borderTop: "1px solid var(--line)", paddingTop: "0.6rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ flex: 1, fontSize: "0.92rem" }}>{p.statement}</strong>
                  <span className={`pill ${PILL[p.current_status] ?? "neutral"}`}>
                    {ICON[p.current_status]} {d.pstatus[p.current_status as keyof typeof d.pstatus] ?? p.current_status}
                  </span>
                </div>
                {p.events.map((e, i) => (
                  <div key={i} className="histline">
                    <span className="hd">{e.date}</span>
                    <span className="hl">{d.pstatus[e.status as keyof typeof d.pstatus] ?? e.status}</span>
                    <span style={{ flex: 1, minWidth: "12ch" }}>{e.note}</span>
                    {e.publisher && (
                      <span className="chip cite">▣ {e.publisher}{e.archived ? ` · ${d.archived} ✓` : ""}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <p className="nopos" style={{ marginBottom: 0 }}>{d.hist_note}</p>
          </>
        )}
      </div>

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.flags_h}</div>
        {flags.length === 0 ? (
          <div className="nopos">{d.flags_none}</div>
        ) : (
          flags.map((f) => (
            <div key={f.id} style={{ margin: "0.5rem 0" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ flex: 1, fontSize: "0.92rem" }}>{f.description}</span>
                <span className="pill broken">✗ {d.upheld}</span>
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                {f.citations.map((c, i) => (
                  <span key={i} className="chip cite">▣ {c.publisher} · {c.title}</span>
                ))}
              </div>
              {f.events.map((e, i) => (
                <div key={i} className="histline">
                  <span className="hd">{e.date}</span>
                  <span className="hl">{e.status}</span>
                  <span style={{ flex: 1, minWidth: "12ch" }}>{e.note}</span>
                </div>
              ))}
            </div>
          ))
        )}
        <p className="nopos" style={{ marginBottom: 0 }}>{d.flag_note}</p>
      </div>

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.cand_man_h}</div>
        {commitments.length === 0 ? (
          <div className="nopos">{d.cand_man_none}</div>
        ) : (
          <>
            {commitments.map((c) => {
              const s = STANCE[c.stance] ?? STANCE.no_response;
              return (
                <div key={c.id} style={{ margin: "0.5rem 0" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <Link href={`/mandates/${c.mandate_id}?lang=${lang}`} style={{ flex: 1, fontSize: "0.92rem" }}>
                      {c.mandate_summary}
                    </Link>
                    <span className={`chip band ${s.cls}`}>{s.ic} {s.label}</span>
                  </div>
                  <div className="cover" style={{ margin: "0.15rem 0" }}>
                    {c.office ?? ""} · {c.turnout_count.toLocaleString()} {d.man_turnout} · +{c.margin_pct}% {d.man_margin}
                  </div>
                  {c.statement && <p style={{ fontSize: "0.9rem", margin: "0.25rem 0" }}>“{c.statement}”</p>}
                  {c.publisher && <span className="chip cite">▣ {c.publisher} · {c.cit_title}</span>}
                  {c.became_promise && <p className="pill kept" style={{ marginTop: "0.3rem" }}>✓ {d.became_promise}</p>}
                </div>
              );
            })}
            <p className="nopos" style={{ marginBottom: 0 }}>{d.stance_none_note}</p>
          </>
        )}
      </div>

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.money_h}</div>
        {profile.expenditures.length === 0 ? (
          <div className="nopos">{d.money_none}</div>
        ) : (
          profile.expenditures.map(
            (
              e: {
                committee: string;
                direction: string;
                amount_usd: string;
                expenditure_date: string;
                purpose: string | null;
                publisher: string;
              },
              i: number,
            ) => (
              <div key={i} style={{ margin: "0.35rem 0" }}>
                <span style={{ fontSize: "0.85rem" }}>
                  {e.committee} — <strong>${Number(e.amount_usd).toLocaleString()}</strong>{" "}
                  {e.direction === "supporting" ? d.supporting : d.opposing}
                  {e.purpose ? ` · ${e.purpose}` : ""}
                </span>{" "}
                <span className="chip cite">▣ {e.publisher} · {String(e.expenditure_date).slice(0, 10)}</span>
              </div>
            ),
          )
        )}
      </div>

      <div className="card">
        <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.endorse_h}</div>
        {profile.endorsements.length === 0 ? (
          <div className="nopos">{d.endorse_none}</div>
        ) : (
          profile.endorsements.map(
            (e: { organization: string; endorsed_at: string; publisher: string }, i: number) => (
              <div key={i} style={{ margin: "0.35rem 0" }}>
                <span style={{ fontSize: "0.85rem" }}>{e.organization}</span>{" "}
                <span className="chip cite">▣ {e.publisher} · {String(e.endorsed_at).slice(0, 10)}</span>
              </div>
            ),
          )
        )}
      </div>
      </div>
    </>
  );
}
