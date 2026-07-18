import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { langFrom, t } from "@/lib/i18n";
import { mandateDetail } from "@/lib/referenda";

export const dynamic = "force-dynamic";

interface Commitment {
  id: string; stance: string; statement: string | null; date: string;
  politician_id: string; full_name: string; party: string | null; cycle: string;
  publisher: string | null; cit_title: string | null; became_promise: boolean;
}

export default async function MandatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const m = await mandateDetail(id);
  if (!m || m.overlay_status === "below_threshold_unpublished") notFound();
  const OPT: Record<string, string> = { yes: d.choice_yes, no: d.choice_no };
  const STANCE: Record<string, { label: string; cls: string; ic: string }> = {
    commit: { label: d.stance_commit, cls: "b2", ic: "✓" },
    decline: { label: d.stance_decline, cls: "bm2", ic: "✗" },
    no_response: { label: d.stance_none, cls: "bnull", ic: "—" },
  };

  return (
    <>
      <SiteHeader lang={lang} path={`/mandates/${id}`} />
      <div className="pagepad">
        <p style={{ margin: "0.6rem 0 0" }}>
          <Link href={`/mandates?lang=${lang}`}>← {d.man_h}</Link>
        </p>
        <div className="pagetitle">{m.mandate_summary}</div>
        <p className="sub">{m.office ?? ""} · {m.question_text}</p>

        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{lang === "es" ? d.man_advisory : m.disclosure_text}</span>
        </div>

        <div className="card">
          <div className="grouph" style={{ margin: "0 0 0.4rem" }}>{d.ref_results_h}</div>
          <div className="cover">
            {m.turnout_count.toLocaleString()} {d.man_turnout}
            {m.turnout_pct !== null ? ` (${m.turnout_pct}% ${d.man_of_reg})` : ""} · +{m.margin_pct}% {d.man_margin}
          </div>
          {m.results.total > 0 &&
            m.results.counts.map((c: { choice: string; n: number }) => (
              <div key={c.choice} style={{ margin: "0.35rem 0" }}>
                <div className="cover">
                  {OPT[c.choice] ?? c.choice} · {c.n.toLocaleString()} ({Math.round((c.n / m.results.total) * 1000) / 10}%)
                </div>
                <div className="covbar" aria-hidden>
                  <i style={{ width: `${(c.n / m.results.total) * 100}%` }} />
                </div>
              </div>
            ))}
          <p className="nopos" style={{ margin: "0.4rem 0 0" }}>
            <Link href={`/referenda/${m.referendum_id}?lang=${lang}`}>{d.ref_view} →</Link>
          </p>
        </div>

        <div className="grouph">{d.man_commit_h}</div>
        {(m.commitments as Commitment[]).map((c) => {
          const s = STANCE[c.stance] ?? STANCE.no_response;
          return (
            <div className="card" key={c.id}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <Link href={`/candidates/${c.politician_id}?lang=${lang}`} style={{ flex: 1 }}>
                  <strong>{c.full_name}</strong> {c.party ? `(${c.party})` : ""}
                </Link>
                <span className={`chip band ${s.cls}`}>{s.ic} {s.label}</span>
              </div>
              <div className="cover" style={{ margin: "0.15rem 0" }}>{c.cycle}</div>
              {c.statement && <p style={{ fontSize: "0.92rem", margin: "0.35rem 0" }}>“{c.statement}”</p>}
              {c.publisher && (
                <span className="chip cite">▣ {c.publisher} · {c.cit_title} · {c.date}</span>
              )}
              {c.became_promise && (
                <p className="pill kept" style={{ marginTop: "0.4rem" }}>✓ {d.became_promise}</p>
              )}
            </div>
          );
        })}
        <p className="nopos">{d.stance_none_note}</p>
        <p className="nopos">{d.man_loop_note}</p>
      </div>
    </>
  );
}
