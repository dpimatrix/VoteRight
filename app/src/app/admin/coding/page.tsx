import { isAdmin } from "@/lib/adminAuth";
import { adminCodingQueue } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CodingPage() {
  if (!(await isAdmin())) return null;
  const queue = await adminCodingQueue();
  return (
    <>
      <div className="pagetitle">Position-coding queue</div>
      <p className="sub">
        SCORING.md §S2, operable: the source excerpt, its citation, and the axis question
        side by side. Adjust the value if the model&apos;s suggestion is off, then confirm — or
        reject. Only confirmed rows can ever score a candidate (a generated column, not a
        convention).
      </p>
      {queue.length === 0 && <p className="nopos">Queue is empty — every coding is human-confirmed.</p>}
      {queue.map((q) => {
        const act = `/api/admin/codings/${q.id}`;
        return (
          <div className="card" key={q.id}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <strong style={{ flex: 1 }}>{q.full_name}</strong>
              <span className="chip cite">▣ {q.axis_key}</span>
              <span className="pill pending">unconfirmed</span>
            </div>
            <div style={{ fontWeight: 650, fontSize: "0.9rem", marginTop: "0.3rem" }}>{q.question}</div>
            <div className="poles-note"><span>−2 · {q.negative_pole}</span><span>+2 · {q.positive_pole}</span></div>
            <div className="histline" style={{ borderLeftStyle: "dotted" }}>
              <span style={{ flex: 1, fontStyle: "italic" }}>“{q.statement}”</span>
            </div>
            <span className="chip cite">▣ {q.title ?? q.publisher} · {q.source_type} · {q.date}</span>
            <div className="admform" style={{ alignItems: "center" }}>
              <form method="post" action={act}><input type="hidden" name="action" value="down" /><button aria-label="decrease">−</button></form>
              <strong style={{ minWidth: "3ch", textAlign: "center" }}>{q.value > 0 ? `+${q.value}` : q.value}</strong>
              <form method="post" action={act}><input type="hidden" name="action" value="up" /><button aria-label="increase">+</button></form>
              <form method="post" action={act}><input type="hidden" name="action" value="confirm" /><button>Confirm coding</button></form>
              <form method="post" action={act}><input type="hidden" name="action" value="reject" /><button>Reject</button></form>
            </div>
            <p className="nopos" style={{ margin: 0 }}>
              Model suggested — a suggestion never scores anyone until a human confirms it
              (usable_for_scoring stays FALSE).
            </p>
          </div>
        );
      })}
    </>
  );
}
