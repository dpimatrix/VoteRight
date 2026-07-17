import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/adminAuth";
import { adminFlagDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DisputeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  const flag = await adminFlagDetail(id);
  if (!flag) notFound();

  const act = `/api/admin/flags/${id}`;
  const hasReply = flag.events.some((e: { note: string | null }) => e.note?.includes("REPLY"));
  const replySent = flag.events.some((e: { note: string | null }) =>
    e.note?.startsWith("Right of reply sent"),
  );

  return (
    <>
      <p><Link href="/admin/disputes">← All disputes</Link></p>
      <div className="card">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
          <strong style={{ flex: 1 }}>{flag.full_name}</strong>
          {flag.published ? (
            <span className="pill broken">✗ upheld · published</span>
          ) : (
            <span className={`pill ${flag.status === "open" ? "pending" : "neutral"}`}>{flag.status}</span>
          )}
        </div>
        <p style={{ fontSize: "0.92rem" }}>{flag.description}</p>

        {flag.events.map(
          (e: { status: string; note: string | null; date: string; publisher: string | null; title: string | null }, i: number) => (
            <div key={i} className="histline">
              <span className="hd">{e.date}</span>
              <span className="hl">{e.status}</span>
              <span style={{ flex: 1, minWidth: "14ch" }}>{e.note}</span>
              {e.publisher && <span className="chip cite">▣ {e.publisher} · {e.title}</span>}
            </div>
          ),
        )}

        {flag.status === "open" && (
          <>
            <div className="grouph">Attach evidence (creates a citation + event)</div>
            <form className="admform" method="post" action={act}>
              <input type="hidden" name="action" value="evidence" />
              <input type="text" name="url" placeholder="Source URL" aria-label="Source URL" required />
              <input type="text" name="title" placeholder="Title" aria-label="Title" required />
              <input type="text" name="publisher" placeholder="Publisher" aria-label="Publisher" required />
              <button type="submit">Attach</button>
            </form>

            {!replySent ? (
              <form className="admform" method="post" action={act}>
                <input type="hidden" name="action" value="reply_request" />
                <button type="submit">Send right of reply (14-day window)</button>
              </form>
            ) : (
              <form className="admform" method="post" action={act}>
                <input type="hidden" name="action" value="reply" />
                <input type="text" name="note" placeholder="Paste the candidate's reply verbatim" aria-label="Reply" required />
                <button type="submit">Record reply</button>
              </form>
            )}

            <div className="grouph">Resolve</div>
            {!hasReply && !replySent ? (
              <p className="nopos">Resolution unlocks after the right-of-reply step.</p>
            ) : (
              <div className="admform">
                <form method="post" action={act} style={{ flex: 1, display: "flex" }}>
                  <input type="hidden" name="action" value="uphold" />
                  <button type="submit" style={{ width: "100%" }}>Uphold &amp; publish</button>
                </form>
                <form method="post" action={act} style={{ flex: 1, display: "flex" }}>
                  <input type="hidden" name="action" value="dismiss" />
                  <button type="submit" style={{ width: "100%" }}>Dismiss</button>
                </form>
              </div>
            )}
            <button className="gatebtn" disabled>
              Publish flag — blocked
              <small>CHECK (NOT published OR status &lt;&gt; &apos;open&apos;) — a flag in dispute can never go public</small>
            </button>
          </>
        )}
      </div>
    </>
  );
}
