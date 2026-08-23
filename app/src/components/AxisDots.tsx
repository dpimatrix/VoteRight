"use client";

import { useState, type SyntheticEvent } from "react";
import type { Lang, t } from "@/lib/i18n";
import { BAND_CLASS, BAND_KEY, DOT_CLASS, SRC_LABEL } from "@/lib/scoreLabels";
import type { PriorityWithAxis } from "@/lib/matches";

interface EvidenceItem {
  statement: string;
  sourceType: string;
  publisher: string | null;
  title: string | null;
  date: string | null;
  archived: boolean;
}

/** Per-axis dots on a Matches card, made tappable (2026-08-23): each dot used
    to be purely decorative (aria-hidden, no way to tell which priority it
    represented). Tapping one now opens the same topicrow breakdown the
    candidate profile page already shows for that one axis -- same classes,
    same copy, so this never drifts from the full profile's version of the
    same fact.

    Deliberately a `span[role=button]`, not a real `<button>`: the whole
    Matches card is one big <Link>, and HTML doesn't allow interactive
    content nested inside interactive content. stopPropagation keeps a tap
    on a dot (or on the opened panel) from also triggering the card's own
    navigation. */
export function AxisDots({
  priorities,
  perAxis,
  evidence,
  d,
  lang,
}: {
  priorities: PriorityWithAxis[];
  perAxis: Record<string, { agreement: number | null; conflict: boolean }>;
  evidence: Record<string, EvidenceItem[]>;
  d: ReturnType<typeof t>;
  lang: Lang;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (axisId: string) => setOpen((cur) => (cur === axisId ? null : axisId));
  const stop = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openPriority = priorities.find((p) => p.axisId === open);
  const openScore = open ? perAxis[open] : undefined;
  const openItems = (open ? evidence[open] : undefined) ?? [];

  return (
    <>
      <span className="dots">
        {priorities.map((p) => {
          const a = perAxis[p.axisId]?.agreement ?? null;
          return (
            <span
              key={p.axisId}
              role="button"
              tabIndex={0}
              aria-expanded={open === p.axisId}
              aria-label={`${p.question} — ${d.band[BAND_KEY(a)]}`}
              className={DOT_CLASS(a)}
              onClick={(e) => {
                stop(e);
                toggle(p.axisId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  stop(e);
                  toggle(p.axisId);
                }
              }}
            />
          );
        })}
      </span>
      {openPriority && (
        <div className="topicrow" onClick={stop}>
          <div className="trhead">
            <span className="tn">{openPriority.question}</span>
            <span className={`chip band ${BAND_CLASS(openScore?.agreement ?? null)}`}>
              {d.band[BAND_KEY(openScore?.agreement ?? null)]}
            </span>
          </div>
          <div className="yours">
            {d.you_said} <q>{openPriority.statement}</q> · {d.weight[openPriority.weight]}
          </div>
          {openItems.length === 0 ? (
            <div className="nopos">{d.silence_row}</div>
          ) : (
            openItems.map((e, i) => (
              <div key={i}>
                <div className="theirs">{e.statement}</div>
                <span className="chip cite">
                  ▣ {SRC_LABEL[e.sourceType]?.[lang] ?? e.sourceType} · {e.title ?? e.publisher} ·{" "}
                  {e.date} {e.archived ? `· ${d.archived} ✓` : ""}
                </span>
              </div>
            ))
          )}
          {openScore?.conflict && <div className="evrow">{d.conflict}</div>}
        </div>
      )}
    </>
  );
}
