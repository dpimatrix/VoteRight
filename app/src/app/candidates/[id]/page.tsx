import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import {
  evidenceForPoliticians,
  loadPriorities,
  politicianProfile,
  topicsWithAxes,
} from "@/lib/queries";
import { agreement, axisValue } from "@/lib/scoring/engine";
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

  return (
    <>
      <SiteHeader lang={lang} path={`/candidates/${id}`} />
      <div className="row1">
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
    </>
  );
}
