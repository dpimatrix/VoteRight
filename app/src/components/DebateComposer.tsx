"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

type D = Pick<
  Dict,
  | "comp_h" | "comp_side" | "comp_body_ph" | "comp_cite_ph" | "comp_post" | "comp_pub"
  | "claim_q" | "claim_add" | "claim_op" | "claim_dismiss"
  | "side_for" | "side_against" | "side_neutral" | "pending_mod"
>;

export function DebateComposer({ threadId, proposalId, d }: { threadId: string; proposalId: string; d: D }) {
  const router = useRouter();
  const [side, setSide] = useState<"for" | "against" | "neutral_info">("for");
  const [body, setBody] = useState("");
  const [cite, setCite] = useState("");
  const [claim, setClaim] = useState<string | null>(null);
  const [needCite, setNeedCite] = useState(false);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(claimResponse?: "marked_as_opinion" | "dismissed") {
    setBusy(true);
    const res = await fetch(`/api/debates/${threadId}/argue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side, body, citationUrl: cite || undefined, claimResponse }),
    });
    setBusy(false);
    if (res.status === 403) {
      window.location.href = "/verify";
      return;
    }
    if (!res.ok) return;
    const j = (await res.json()) as { prompted?: boolean; claim?: string };
    if (j.prompted && j.claim) {
      setClaim(j.claim);
      return;
    }
    setPosted(true);
    setClaim(null);
    setBody("");
    setCite("");
    setNeedCite(false);
    router.refresh();
    // proposalId unused beyond keying — refresh re-reads the server page
    void proposalId;
  }

  if (posted) {
    return (
      <div className="card">
        <span className="pill pending">⟳ {d.pending_mod}</span>
        <button className="btn secondary" style={{ marginTop: "0.6rem" }} onClick={() => setPosted(false)}>
          {d.comp_h}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="pagetitle" style={{ marginTop: 0, fontSize: "1.05rem" }}>{d.comp_h}</div>
      <div className="seg" role="group" aria-label={d.comp_side}>
        {(
          [
            ["for", d.side_for],
            ["against", d.side_against],
            ["neutral_info", d.side_neutral],
          ] as const
        ).map(([v, label]) => (
          <button key={v} className={side === v ? "on" : ""} aria-pressed={side === v} onClick={() => setSide(v)}>
            {label}
          </button>
        ))}
      </div>
      <textarea
        className="statement"
        rows={4}
        placeholder={d.comp_body_ph}
        aria-label={d.comp_body_ph}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {(needCite || cite) && (
        <input
          type="url"
          className="statement"
          style={{ marginTop: "0.4rem", minHeight: 0 }}
          placeholder={d.comp_cite_ph}
          aria-label={d.comp_cite_ph}
          value={cite}
          onChange={(e) => setCite(e.target.value)}
        />
      )}
      {claim && (
        <div className="disclosure" style={{ marginBottom: "0.4rem" }}>
          <span className="tag">?</span>
          <span>
            <strong>{d.claim_q}</strong>
            <br />
            <span style={{ opacity: 0.8 }}>“{claim}”</span>
            <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
              <button className="btn secondary" style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }} disabled={busy}
                onClick={() => { setNeedCite(true); setClaim(null); }}>
                {d.claim_add}
              </button>
              <button className="btn secondary" style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }} disabled={busy}
                onClick={() => submit("marked_as_opinion")}>
                {d.claim_op}
              </button>
              <button className="btn secondary" style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }} disabled={busy}
                onClick={() => submit("dismissed")}>
                {d.claim_dismiss}
              </button>
            </span>
          </span>
        </div>
      )}
      {!claim && (
        <button className="btn" style={{ marginTop: "0.5rem" }} disabled={busy || body.trim().length < 10} onClick={() => submit()}>
          {d.comp_post}
        </button>
      )}
      <div className="privnote" style={{ marginBottom: 0 }}>
        <span className="dot" style={{ background: "var(--adv)" }} />
        <span>{d.comp_pub}</span>
      </div>
    </div>
  );
}
