import { isAdmin } from "@/lib/adminAuth";
import {
  axesForCoding,
  politiciansWithVotes,
  recentCodedPositions,
  votesForCoding,
} from "@/lib/positions";

export const dynamic = "force-dynamic";

export default async function AdminPositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ politician?: string; ok?: string; e?: string }>;
}) {
  if (!(await isAdmin())) return null;
  const sp = await searchParams;
  const pols = await politiciansWithVotes();
  const selected = pols.find((p) => p.id === sp.politician) ?? null;
  const votes = selected ? await votesForCoding(selected.id) : [];
  const axes = await axesForCoding();
  const recent = await recentCodedPositions();

  return (
    <>
      <div className="pagetitle">Vote → position coding</div>
      <p className="sub">
        The interpretive step, done deliberately: pick a recorded vote, say what it means
        on one published axis, in one sentence a voter can read. The official roll-call
        record becomes the citation; staff codings are usable for scoring (SCORING.md
        S2). One bill codes onto one axis once per person — duplicates are refused.
        Public score display still waits on the counsel methodology review and the 50%
        coverage gate.
      </p>
      {sp.ok && <p className="pill kept">✓ Position created from the vote, with the roll-call record as citation.</p>}
      {sp.e === "duplicate" && <p className="pill broken">✗ That bill is already coded onto that axis for this person.</p>}
      {sp.e && sp.e !== "duplicate" && <p className="pill broken">✗ Refused — statement and a value between −2 and +2 are required.</p>}

      <div className="card">
        <form method="get" className="admform" style={{ marginTop: 0 }}>
          <select name="politician" style={{ flex: 1 }} defaultValue={selected?.id ?? ""}>
            <option value="">— pick a politician —</option>
            {pols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} · {p.votes} votes · {p.axes_covered}/6 axes covered
              </option>
            ))}
          </select>
          <button type="submit">Load votes</button>
        </form>
      </div>

      {selected &&
        votes.map((v) => (
          <div className="card" key={v.bill_external_id} style={v.already_coded ? { opacity: 0.55 } : undefined}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <span className={`chip band ${v.vote === "yea" ? "b2" : "bm2"}`}>{v.vote.toUpperCase()}</span>
              <strong style={{ flex: 1, fontSize: "0.9rem" }}>{v.bill_external_id} · {v.bill_title}</strong>
              <a className="chip cite" href={v.source_url} target="_blank" rel="noreferrer">▣ record · {v.date}</a>
            </div>
            {v.already_coded && <p className="nopos" style={{ margin: "0.3rem 0 0" }}>Already coded from this record.</p>}
            {!v.already_coded && (
              <form method="post" action="/api/admin/positions" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.45rem" }}>
                <input type="hidden" name="politician_id" value={selected.id} />
                <input type="hidden" name="bill_external_id" value={v.bill_external_id} />
                <div className="admform" style={{ marginTop: 0 }}>
                  <select name="axis_id" required style={{ flex: 2 }}>
                    <option value="">— axis this vote speaks to —</option>
                    {axes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.topic}: {a.question} (−2 {a.negative_pole} · +2 {a.positive_pole})
                      </option>
                    ))}
                  </select>
                  <select name="value" required style={{ flex: 1 }}>
                    <option value="">value</option>
                    {[2, 1, 0, -1, -2].map((n) => (
                      <option key={n} value={n}>{n > 0 ? `+${n}` : n}</option>
                    ))}
                  </select>
                </div>
                <input
                  name="statement"
                  placeholder="One-sentence position statement a voter can read (e.g., 'Voted for the county rent stabilization law.')"
                  required
                />
                <button type="submit">Create position (staff coding — scoring-usable)</button>
              </form>
            )}
          </div>
        ))}

      {recent.length > 0 && (
        <>
          <div className="grouph">Recently coded from votes</div>
          {recent.map((r, i) => (
            <div className="card" key={i} style={{ padding: "0.6rem 0.9rem" }}>
              <span style={{ fontSize: "0.88rem" }}>
                <strong>{r.full_name}</strong> · {r.topic} · value {r.value > 0 ? `+${r.value}` : r.value} · “{r.statement}” · {r.date}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
