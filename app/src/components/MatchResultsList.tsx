"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { AxisDots } from "./AxisDots";
import { Chev } from "./Chev";
import { PolAvatar } from "./PolAvatar";
import { tf, type Lang, type t } from "@/lib/i18n";
import type { PriorityWithAxis, PublicMatchResult } from "@/lib/matches";

// Overall-band chip (strong/good/mixed/weak/insufficient) -- distinct from
// scoreLabels.ts's BAND_CLASS, which maps a single axis's -2..2 agreement
// value, not this aggregate band.
const OVERALL_BAND_CLASS = { strong: "b2", good: "b1", mixed: "b0", weak: "bm1", insufficient: "bnull" } as const;

/** The Matches results grid, plus compare-candidate selection (2026-08-23).
    A client component (not just AxisDots) because "which 2 candidates are
    selected" is state shared ACROSS cards, not scoped to one -- has to live
    above the .map(), not inside a per-card island. */
export function MatchResultsList({
  results,
  priorities,
  d,
  lang,
  raceId,
}: {
  // PublicMatchResult, not MatchResult (found live 2026-08-29): this
  // component must never even be OFFERED a raw aggregate score to
  // accidentally render -- see toPublicResults's own comment in
  // lib/matches.ts. Both call sites (the API route and the server-rendered
  // page) now redact before this component ever sees a result.
  results: PublicMatchResult[];
  priorities: PriorityWithAxis[];
  d: ReturnType<typeof t>;
  lang: Lang;
  raceId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleCompare = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));

  const nameOf = (id: string) => results.find((r) => r.politicianId === id)?.fullName ?? "";

  return (
    <>
      {selected.length === 1 && (
        <p className="nopos compare-bar">
          {tf(d.compare_pick_one_more, { name: nameOf(selected[0]) })}{" "}
          <button type="button" className="chip cite" onClick={() => setSelected([])}>
            {d.compare_clear}
          </button>
        </p>
      )}
      {selected.length === 2 && (
        <p className="compare-bar">
          <Link
            className="btn"
            href={`/compare?race=${raceId}&a=${selected[0]}&b=${selected[1]}&lang=${lang}`}
          >
            {tf(d.compare_cta, { a: nameOf(selected[0]), b: nameOf(selected[1]) })}
          </Link>
          <button type="button" className="chip cite" onClick={() => setSelected([])}>
            {d.compare_clear}
          </button>
        </p>
      )}

      {results.map((r) => {
        const insuff = r.score.overall === "insufficient";
        const isSelected = selected.includes(r.politicianId);
        const stop = (e: SyntheticEvent) => {
          e.preventDefault();
          e.stopPropagation();
        };
        return (
          <Link
            key={r.politicianId}
            className={`cand ${insuff ? "insuff" : ""} ${r.score.dealbreaker ? "deal" : ""}`}
            href={`/candidates/${r.politicianId}?lang=${lang}`}
          >
            <PolAvatar name={r.fullName} photoUrl={r.photoUrl} />
            <span className="body">
              <span className="row1">
                <span className="cname">{r.fullName}</span>
                <span className="cparty">({r.party ?? d.nonpartisan})</span>
                {r.incumbent && <span className="inc">{d.incumbent}</span>}
              </span>
              <span className="row2">
                <span className={`chip band ${OVERALL_BAND_CLASS[r.score.overall]}`}>
                  {d.ov[r.score.overall]}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  className={`chip cite compare-toggle ${isSelected ? "on" : ""}`}
                  onClick={(e) => {
                    stop(e);
                    toggleCompare(r.politicianId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      stop(e);
                      toggleCompare(r.politicianId);
                    }
                  }}
                >
                  {isSelected ? d.compare_selected : d.compare_add}
                </span>
              </span>
              {r.score.dealbreaker && (
                <span className="row2">
                  <span className="chip band bm1">⚠ {d.deal}</span>
                </span>
              )}
              <AxisDots
                priorities={priorities}
                perAxis={r.score.perAxis}
                evidence={r.evidence}
                d={d}
                lang={lang}
              />
              <span className="covbar" aria-hidden>
                <i style={{ width: `${Math.round(r.score.coverage * 100)}%` }} />
              </span>
              <span className="cover">
                {d.based_on} {r.score.answered}/{r.score.total} {d.of_your}
              </span>
              {insuff && <span className="nopos" style={{ display: "block" }}>{d.insuff_note}</span>}
            </span>
            <Chev />
          </Link>
        );
      })}
      <p className="nopos">
        {d.method} <span className="chip cite">▣ {results[0]?.score.algorithmVersion}</span>
      </p>
    </>
  );
}
