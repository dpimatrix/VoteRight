"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang, t } from "@/lib/i18n";
import type { SimilarCampaign } from "@/lib/accountability";

/** Renders the reform_title input itself (so it can watch onChange) plus a
    debounced duplicate-campaign check underneath -- suggest, never block
    (see accountability.ts's similarCampaigns() for why). The <input>'s
    `name` attribute is preserved, so the surrounding plain <form method=
    "post"> still submits it exactly as before; this component only adds
    the suggestion behavior, not a different submission path. */
export function ReformTitleField({
  pathwayId,
  placeholder,
  lang,
  d,
}: {
  pathwayId: string;
  placeholder: string;
  lang: Lang;
  d: ReturnType<typeof t>;
}) {
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<SimilarCampaign[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setMatches([]);
      return;
    }
    timer.current = setTimeout(() => {
      const url = `/api/accountability/similar?targetType=charter_or_law_change&pathwayId=${encodeURIComponent(pathwayId)}&q=${encodeURIComponent(value)}`;
      fetch(url)
        .then((r) => r.json())
        .then((res) => setMatches(res.matches ?? []))
        .catch(() => setMatches([]));
    }, 400);
    return () => clearTimeout(timer.current);
  }, [value, pathwayId]);

  return (
    <>
      <input
        name="reform_title"
        placeholder={placeholder}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {matches.length > 0 && (
        <div className="similar-box">
          <div className="grouph" style={{ margin: 0 }}>{d.acct_similar_h}</div>
          {matches.map((m) => (
            <Link key={m.id} className="seat" href={`/accountability/${m.id}?lang=${lang}`}>
              <span className="sname">
                {m.label}
                <span className="smeta">
                  {m.supportCount} {d.acct_supporters}
                </span>
              </span>
              <span className="chip cite">{d.acct_similar_support_cta}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
