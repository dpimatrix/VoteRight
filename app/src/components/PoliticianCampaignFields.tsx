"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang, t } from "@/lib/i18n";
import type { SimilarCampaign } from "@/lib/accountability";

/** Renders both selects for the politician-targeting campaign form. Unlike
    ReformTitleField, there's no free-text title to fuzzy-match here -- the
    resident picks a pathway + politician from fixed lists, so once both
    are chosen this checks for an exact (politician_id, pathway_id) match
    instead (see accountability.ts's similarCampaigns()). Both <select>s
    keep their `name` attribute, so the surrounding plain <form method=
    "post"> submits exactly as before. */
export function PoliticianCampaignFields({
  officePathways,
  politicians,
  mechLabel,
  lang,
  d,
}: {
  officePathways: { id: string; mechanism_type: string; office_title: string | null }[];
  politicians: { id: string; full_name: string; party: string | null; office_title: string; jurisdiction_name: string }[];
  mechLabel: Record<string, string>;
  lang: Lang;
  d: ReturnType<typeof t>;
}) {
  const [pathwayId, setPathwayId] = useState(officePathways[0]?.id ?? "");
  const [politicianId, setPoliticianId] = useState(politicians[0]?.id ?? "");
  const [matches, setMatches] = useState<SimilarCampaign[]>([]);

  // Grouped by jurisdiction (2026-08-23, owner asked directly: "group by
  // the offices across the ecosystem the address belongs to") -- the same
  // stack the Ballot screen already groups by (county -> state -> country),
  // not a second scheme. politicians arrives pre-sorted local-to-national
  // (see ownOfficeholders()), so Map insertion order alone keeps that
  // order here -- no separate depth field needed on the frontend. A native
  // <select> can't nest <optgroup>s, so office_title rides along in each
  // option's own text instead of a second grouping level.
  const byJurisdiction = new Map<string, typeof politicians>();
  for (const p of politicians) {
    const group = byJurisdiction.get(p.jurisdiction_name) ?? [];
    group.push(p);
    byJurisdiction.set(p.jurisdiction_name, group);
  }

  useEffect(() => {
    if (!pathwayId || !politicianId) {
      setMatches([]);
      return;
    }
    const url = `/api/accountability/similar?targetType=politician&pathwayId=${encodeURIComponent(pathwayId)}&politicianId=${encodeURIComponent(politicianId)}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => setMatches(res.matches ?? []))
      .catch(() => setMatches([]));
  }, [pathwayId, politicianId]);

  return (
    <>
      <select name="pathway_id" required value={pathwayId} onChange={(e) => setPathwayId(e.target.value)}>
        {officePathways.map((p) => (
          <option key={p.id} value={p.id}>
            {p.office_title ?? ""} — {mechLabel[p.mechanism_type] ?? p.mechanism_type}
          </option>
        ))}
      </select>
      <select name="politician_id" required value={politicianId} onChange={(e) => setPoliticianId(e.target.value)}>
        {[...byJurisdiction.entries()].map(([jurisdictionName, group]) => (
          <optgroup key={jurisdictionName} label={jurisdictionName}>
            {group.map((p) => (
              <option key={p.id} value={p.id}>
                {p.office_title} — {p.full_name}
                {p.party ? ` (${p.party})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
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
