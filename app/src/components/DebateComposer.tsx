"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { canonicalArgumentPayload } from "@/lib/canonical";
import { currentUserIdForSigning, ensureSigningKey, signPayload } from "@/lib/clientSigning";
import type { Dict } from "@/lib/i18n";

type D = Pick<
  Dict,
  | "comp_h" | "comp_side" | "comp_body_ph" | "comp_cite_ph" | "comp_post" | "comp_pub"
  | "comp_format" | "comp_format_text" | "comp_format_audio" | "comp_format_video"
  | "comp_media_hint" | "comp_media_choose" | "comp_uploading"
  | "err_too_long" | "err_too_large" | "err_media_invalid" | "err_processing_failed" | "err_rate_limited"
  | "claim_q" | "claim_add" | "claim_op" | "claim_dismiss"
  | "side_for" | "side_against" | "side_neutral" | "pending_mod"
>;

const MAX_MEDIA_SECONDS = 180; // mirrors media.ts's MAX_DURATION_SECONDS — this is only the fast client-side check, the server re-checks authoritatively

const ERROR_KEY: Record<string, keyof D> = {
  too_long: "err_too_long",
  too_large: "err_too_large",
  invalid: "err_media_invalid",
  processing_failed: "err_processing_failed",
  rate_limited: "err_rate_limited",
};

export function DebateComposer({ threadId, proposalId, d }: { threadId: string; proposalId: string; d: D }) {
  const router = useRouter();
  const [side, setSide] = useState<"for" | "against" | "neutral_info">("for");
  const [format, setFormat] = useState<"text" | "audio" | "video">("text");
  const [body, setBody] = useState("");
  const [cite, setCite] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [claim, setClaim] = useState<string | null>(null);
  const [needCite, setNeedCite] = useState(false);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickMediaFile(f: File | null) {
    setMediaError(null);
    setMediaFile(null);
    if (!f) return;
    // Soft, client-side-only duration check (fast feedback) — the server's
    // ffprobe check on the actual uploaded bytes is the real gate.
    const probe = document.createElement(format === "video" ? "video" : "audio");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(probe.src);
      if (probe.duration > MAX_MEDIA_SECONDS) {
        setMediaError(d.err_too_long);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMediaFile(f);
      }
    };
    probe.onerror = () => {
      URL.revokeObjectURL(probe.src);
      setMediaError(d.err_media_invalid);
    };
    probe.src = URL.createObjectURL(f);
  }

  async function submit(claimResponse?: "marked_as_opinion" | "dismissed") {
    setBusy(true);
    setMediaError(null);

    if (format !== "text") {
      if (!mediaFile) {
        setBusy(false);
        return;
      }
      const fd = new FormData();
      fd.set("side", side);
      fd.set("format", format);
      fd.set("media", mediaFile);
      const res = await fetch(`/api/debates/${threadId}/argue`, { method: "POST", body: fd });
      setBusy(false);
      if (res.status === 403) {
        window.location.href = "/verify";
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMediaError(j.error ? d[ERROR_KEY[j.error] ?? "err_processing_failed"] : d.err_processing_failed);
        return;
      }
      setPosted(true);
      setMediaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
      return;
    }

    // Non-repudiation signing (ARCHITECTURE.md §10) - best-effort: if key setup
    // or signing fails for any reason (unsupported browser, IndexedDB blocked),
    // fall back to posting unsigned rather than blocking the user from speaking.
    // Media posts (above) skip signing for this first pass — see debates.ts.
    let signature: string | undefined;
    let publicKeyFingerprint: string | undefined;
    try {
      const [{ fingerprint }, userId] = await Promise.all([ensureSigningKey(), currentUserIdForSigning()]);
      const payload = canonicalArgumentPayload({ threadId, userId, side, body, citationUrl: cite || undefined });
      const signed = await signPayload(payload);
      signature = signed.signature;
      publicKeyFingerprint = fingerprint;
    } catch {
      // Unsigned fallback - see comment above.
    }
    const res = await fetch(`/api/debates/${threadId}/argue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side, body, citationUrl: cite || undefined, claimResponse, signature, publicKeyFingerprint }),
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
      <div className="seg" role="group" aria-label={d.comp_format} style={{ marginTop: "0.4rem" }}>
        {(
          [
            ["text", d.comp_format_text],
            ["audio", d.comp_format_audio],
            ["video", d.comp_format_video],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            className={format === v ? "on" : ""}
            aria-pressed={format === v}
            onClick={() => {
              setFormat(v);
              setMediaFile(null);
              setMediaError(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {format === "text" && (
        <>
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
        </>
      )}

      {format !== "text" && (
        <div style={{ marginTop: "0.4rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={format === "video" ? "video/*" : "audio/*"}
            capture={format === "video" ? "environment" : undefined}
            aria-label={d.comp_media_choose}
            onChange={(e) => pickMediaFile(e.target.files?.[0] ?? null)}
          />
          <p className="nopos" style={{ margin: "0.35rem 0 0" }}>{d.comp_media_hint}</p>
          {mediaError && (
            <p className="nopos" style={{ margin: "0.3rem 0 0", color: "var(--adv, #b00)" }}>{mediaError}</p>
          )}
        </div>
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
        <button
          className="btn"
          style={{ marginTop: "0.5rem" }}
          disabled={busy || (format === "text" ? body.trim().length < 10 : !mediaFile)}
          onClick={() => submit()}
        >
          {busy && format !== "text" ? d.comp_uploading : d.comp_post}
        </button>
      )}
      <div className="privnote" style={{ marginBottom: 0 }}>
        <span className="dot" style={{ background: "var(--adv)" }} />
        <span>{d.comp_pub}</span>
      </div>
    </div>
  );
}
