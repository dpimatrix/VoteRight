"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";
import { LEVEL_RANK } from "@/lib/raceOrder";

interface Topic {
  topic_id: string;
  name: string;
  axis_id: string;
  question: string;
  negative_pole: string;
  positive_pole: string;
  level: string;
}

// Level-grouped display (2026-09-30, owner request): a flat list mixing a
// county question next to a federal one with no visual distinction gets
// disorienting once more than a handful of axes exist -- same level
// set/ordering raceOrder.ts's own LEVEL_RANK already established for the
// Ballot page, reused here rather than duplicated. An unrecognized level
// (shouldn't happen -- topicsWithAxes() only ever emits the 6 real
// jurisdictions.level values -- but never trust that blindly) sorts last
// via the same `?? 99` fallback LEVEL_RANK's own callers already use.
function groupByLevel(topics: Topic[]): { level: string; items: Topic[] }[] {
  const byLevel = new Map<string, Topic[]>();
  for (const tp of topics) {
    const list = byLevel.get(tp.level);
    if (list) list.push(tp);
    else byLevel.set(tp.level, [tp]);
  }
  return [...byLevel.entries()]
    .map(([level, items]) => ({ level, items }))
    .sort((a, b) => (LEVEL_RANK[a.level] ?? 99) - (LEVEL_RANK[b.level] ?? 99));
}

// One shared type for the level-label keys, used both by LEVEL_LABEL_KEY
// below and the `d` prop's own Pick<> -- keeps them from drifting apart
// (the original single Record<string, keyof Dict> typed the map's values
// too broadly for TypeScript to verify indexing the narrowed `d` prop was
// safe, even though every value in the map is, in fact, one of d's own
// picked keys).
type LevelLabelKey =
  | "prio_level_federal" | "prio_level_state" | "prio_level_county"
  | "prio_level_municipal" | "prio_level_school_board" | "prio_level_judicial";

const LEVEL_LABEL_KEY: Record<string, LevelLabelKey> = {
  federal: "prio_level_federal",
  state: "prio_level_state",
  county: "prio_level_county",
  municipal: "prio_level_municipal",
  school_board: "prio_level_school_board",
  judicial: "prio_level_judicial",
};
interface Sel {
  direction: 1 | -1;
  weight: number;
  statement: string;
}

export function PriorityForm({
  topics,
  lang,
  d,
  defaultRace,
}: {
  topics: Topic[];
  lang: Lang;
  d: Pick<Dict, "prio_p" | "prio_priv" | "weight" | "see_matches" | "need_more" | LevelLabelKey>;
  defaultRace: string;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, Sel>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = Object.keys(sel).length;
  const groups = groupByLevel(topics);

  function pick(axisId: string, direction: 1 | -1, poleText: string) {
    setSel((s) => {
      const cur = s[axisId];
      if (cur && cur.direction === direction) {
        const { [axisId]: _drop, ...rest } = s;
        return rest; // tapping the active pole deselects the topic
      }
      return {
        ...s,
        [axisId]: { direction, weight: cur?.weight ?? 3, statement: poleText },
      };
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const items = Object.entries(sel).map(([axisId, v]) => ({
      axisId,
      direction: v.direction,
      weight: v.weight,
      statement: v.statement,
    }));
    const res = await fetch("/api/priorities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      setBusy(false);
      setError((await res.json()).error ?? "Error");
      return;
    }
    router.push(`/matches?race=${defaultRace}&lang=${lang}`);
  }

  return (
    <>
      <p className="sub">{d.prio_p}</p>
      {groups.map(({ level, items }) => (
        <div key={level}>
          <div className="grouph">{d[LEVEL_LABEL_KEY[level] ?? "prio_level_federal"]}</div>
          {items.map((tp) => {
        const s = sel[tp.axis_id];
        return (
          <div className="card" key={tp.axis_id}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tp.name}</div>
            <div className="sub" style={{ margin: "0.15rem 0 0" }}>
              {tp.question}
            </div>
            <div className="poles">
              <button
                type="button"
                className={s?.direction === -1 ? "on" : ""}
                aria-pressed={s?.direction === -1}
                onClick={() => pick(tp.axis_id, -1, tp.negative_pole)}
              >
                {tp.negative_pole}
              </button>
              <button
                type="button"
                className={s?.direction === 1 ? "on" : ""}
                aria-pressed={s?.direction === 1}
                onClick={() => pick(tp.axis_id, 1, tp.positive_pole)}
              >
                {tp.positive_pole}
              </button>
            </div>
            {s && (
              <div className="weight">
                <button
                  type="button"
                  aria-label="less"
                  onClick={() =>
                    setSel((x) => ({
                      ...x,
                      [tp.axis_id]: { ...s, weight: Math.max(1, s.weight - 1) },
                    }))
                  }
                >
                  −
                </button>
                <span className="wval">
                  {"●".repeat(s.weight)}
                  {"○".repeat(5 - s.weight)}
                  <br />
                  {d.weight[s.weight]}
                </span>
                <button
                  type="button"
                  aria-label="more"
                  onClick={() =>
                    setSel((x) => ({
                      ...x,
                      [tp.axis_id]: { ...s, weight: Math.min(5, s.weight + 1) },
                    }))
                  }
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
          })}
        </div>
      ))}
      {error && <p className="nopos">{error}</p>}
      <button className="btn" disabled={count < 3 || busy} onClick={submit}>
        {count >= 3 ? d.see_matches : d.need_more}
      </button>
      <div className="privnote">
        <span className="dot" />
        <span>{d.prio_priv}</span>
      </div>
    </>
  );
}
