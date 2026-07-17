"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict, Lang } from "@/lib/i18n";

interface Topic {
  topic_id: string;
  name: string;
  axis_id: string;
  question: string;
  negative_pole: string;
  positive_pole: string;
}
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
  d: Pick<
    Dict,
    "prio_p" | "prio_priv" | "weight" | "see_matches" | "need_more"
  >;
  defaultRace: string;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, Sel>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = Object.keys(sel).length;

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
      {topics.map((tp) => {
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
