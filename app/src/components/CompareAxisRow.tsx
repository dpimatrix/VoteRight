"use client";

import { useState } from "react";
import type { Lang, t } from "@/lib/i18n";
import type { MatchResult, PriorityWithAxis } from "@/lib/matches";
import { BAND_CLASS, BAND_KEY, SRC_LABEL } from "@/lib/scoreLabels";

/** One priority's row on the compare page: both candidates' band chips side
    by side, either independently expandable into the same topicrow
    breakdown AxisDots uses on the Matches screen. Real <button>s here (not
    AxisDots's span[role=button] workaround) -- this page isn't one big
    <Link> card, so there's no nested-interactive-content problem to dodge. */
export function CompareAxisRow({
  priority,
  a,
  b,
  d,
  lang,
}: {
  priority: PriorityWithAxis;
  a: MatchResult;
  b: MatchResult;
  d: ReturnType<typeof t>;
  lang: Lang;
}) {
  const [open, setOpen] = useState<"a" | "b" | null>(null);

  const scoreFor = (m: MatchResult) => m.score.perAxis[priority.axisId]?.agreement ?? null;
  const conflictFor = (m: MatchResult) => m.score.perAxis[priority.axisId]?.conflict ?? false;
  const evidenceFor = (m: MatchResult) => m.evidence[priority.axisId] ?? [];

  const chip = (side: "a" | "b", m: MatchResult) => {
    const ag = scoreFor(m);
    return (
      <button
        type="button"
        className={`chip band ${BAND_CLASS(ag)}`}
        aria-expanded={open === side}
        onClick={() => setOpen(open === side ? null : side)}
      >
        {d.band[BAND_KEY(ag)]}
      </button>
    );
  };

  const openMatch = open === "a" ? a : open === "b" ? b : null;

  return (
    <div className="comparerow">
      <div className="tn">{priority.question}</div>
      <div className="comparecells">
        <div className="comparecell">{chip("a", a)}</div>
        <div className="comparecell">{chip("b", b)}</div>
      </div>
      {openMatch && (
        <div className="topicrow">
          <div className="yours">
            {d.you_said} <q>{priority.statement}</q> · {d.weight[priority.weight]}
          </div>
          {evidenceFor(openMatch).length === 0 ? (
            <div className="nopos">{d.silence_row}</div>
          ) : (
            evidenceFor(openMatch).map((e, i) => (
              <div key={i}>
                <div className="theirs">{e.statement}</div>
                <span className="chip cite">
                  ▣ {SRC_LABEL[e.sourceType]?.[lang] ?? e.sourceType} · {e.title ?? e.publisher} ·{" "}
                  {e.date} {e.archived ? `· ${d.archived} ✓` : ""}
                </span>
              </div>
            ))
          )}
          {conflictFor(openMatch) && <div className="evrow">{d.conflict}</div>}
        </div>
      )}
    </div>
  );
}
