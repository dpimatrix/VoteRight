import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { langFrom, t } from "@/lib/i18n";
import { listMandates, listReferenda } from "@/lib/referenda";

export const dynamic = "force-dynamic";

export default async function MandatesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const userId = await currentUserId();
  const referenda = await listReferenda(userId);
  const mandates = await listMandates();

  const open = referenda.filter((r) => r.status === "open");
  const scheduled = referenda.filter((r) => r.status === "scheduled");
  const awaiting = referenda.filter((r) => r.status === "closed" && !r.certified);
  const published = mandates.filter((m) => m.overlay_status !== "below_threshold_unpublished");
  const below = mandates.filter((m) => m.overlay_status === "below_threshold_unpublished");

  return (
    <>
      <SiteHeader lang={lang} path="/mandates" />
      <div className="pagepad">
        <div className="pagetitle">{d.man_h}</div>
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{d.man_advisory}</span>
        </div>

        {open.length > 0 && (
          <>
            <div className="grouph">{d.ref_open_h}</div>
            {open.map((r) => (
              <Link className="seat" key={r.id} href={`/referenda/${r.id}?lang=${lang}`}>
                <span className="seat-ic">?</span>
                <span className="sname">
                  {r.question_text}
                  <span className="smeta">
                    {r.topic} · {r.ballots} {d.ref_turnout} · {d.ref_closes} {r.closes}
                  </span>
                </span>
                <span className={`chip band ${r.voted ? "b2" : "b1"}`}>{r.voted ? "✓" : d.ref_cast}</span>
              </Link>
            ))}
          </>
        )}

        {scheduled.length > 0 && (
          <>
            <div className="grouph">{d.ref_sched_h}</div>
            {scheduled.map((r) => (
              <Link className="seat" key={r.id} href={`/referenda/${r.id}?lang=${lang}`}>
                <span className="seat-ic">…</span>
                <span className="sname">
                  {r.question_text}
                  <span className="smeta">{r.topic} · {d.ref_opens} {r.opens}</span>
                </span>
              </Link>
            ))}
          </>
        )}

        {awaiting.length > 0 && (
          <>
            <div className="grouph">{d.ref_await_h}</div>
            {awaiting.map((r) => (
              <Link className="seat" key={r.id} href={`/referenda/${r.id}?lang=${lang}`}>
                <span className="seat-ic">⏸</span>
                <span className="sname">
                  {r.question_text}
                  <span className="smeta">{r.topic} · {r.ballots} {d.ref_turnout}</span>
                </span>
              </Link>
            ))}
          </>
        )}

        <div className="grouph">{d.man_pub_h}</div>
        {published.length === 0 && <p className="nopos">—</p>}
        {published.map((m) => (
          <Link className="seat" key={m.id} href={`/mandates/${m.id}?lang=${lang}`}>
            <span className="seat-ic">✓</span>
            <span className="sname">
              {m.mandate_summary}
              <span className="smeta">
                {m.office ?? ""} · {m.turnout_count.toLocaleString()} {d.man_turnout} · +{m.margin_pct}% {d.man_margin}
              </span>
            </span>
            <span className="chip band b1">
              ✓{m.commits} ✗{m.declines} —{m.no_responses}
            </span>
          </Link>
        ))}

        {below.length > 0 && (
          <>
            <div className="grouph">{d.man_rec_h}</div>
            {below.map((m) => (
              <div className="card" key={m.id} style={{ padding: "0.7rem 0.9rem" }}>
                <span style={{ fontSize: "0.9rem" }}>{m.question_text}</span>
                <p className="nopos" style={{ margin: "0.3rem 0 0" }}>
                  {d.man_below_note} ({m.turnout_pct ?? 0}% &lt; {m.threshold_pct}%)
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
