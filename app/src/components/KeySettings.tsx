"use client";

import { useEffect, useRef, useState } from "react";
import {
  type EncryptedBackup,
  ensureSigningKey,
  exportEncryptedBackup,
  importEncryptedBackup,
  revokeAndRotate,
} from "@/lib/clientSigning";
import type { Dict } from "@/lib/i18n";

type D = Pick<
  Dict,
  | "key_h" | "key_p" | "key_fingerprint_label"
  | "key_export_btn" | "key_export_p" | "key_passphrase_ph" | "key_export_go" | "key_export_ok"
  | "key_import_btn" | "key_import_file_label" | "key_import_go" | "key_import_ok" | "key_import_wrong"
  | "key_import_recovered_ok"
  | "key_revoke_btn" | "key_revoke_confirm" | "key_revoke_ok"
  | "key_anomaly_banner" | "key_anomaly_yes" | "key_anomaly_no"
>;

interface Anomaly {
  id: string;
  created_at: string;
}

export function KeySettings({ d }: { d: D }) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "export" | "import">("idle");
  const [passphrase, setPassphrase] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureSigningKey().then(({ fingerprint: fp }) => setFingerprint(fp));
    fetch("/api/keys/anomalies")
      .then((r) => r.json())
      .then((body: { anomalies: Anomaly[] }) => setAnomalies(body.anomalies));
  }, []);

  async function acknowledgeAnomaly(id: string) {
    await fetch(`/api/keys/anomalies/${id}/acknowledge`, { method: "POST" });
    setAnomalies((prev) => prev.filter((a) => a.id !== id));
  }

  async function anomalyNotMe(id: string) {
    await doRevoke();
    await acknowledgeAnomaly(id);
  }

  async function doExport() {
    setBusy(true);
    try {
      const backup = await exportEncryptedBackup(passphrase);
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voteright-key-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage(d.key_export_ok);
      setMode("idle");
      setPassphrase("");
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await file.text()) as EncryptedBackup;
      const { recovered } = await importEncryptedBackup(backup, passphrase);
      if (recovered) {
        // The server just re-pointed our session cookie at a DIFFERENT
        // identity than whatever this page loaded with -- every other
        // piece of server-rendered state on screen (priorities, debate
        // history, subscription tier) is now stale. A full reload is the
        // simple, correct way to pick all of it up consistently, rather
        // than trying to patch each piece of client state by hand.
        const url = new URL(window.location.href);
        url.searchParams.set("recovered", "1");
        window.location.href = url.toString();
        return;
      }
      const { fingerprint: fp } = await ensureSigningKey();
      setFingerprint(fp);
      setMessage(d.key_import_ok);
      setMode("idle");
      setPassphrase("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      setMessage(d.key_import_wrong);
    } finally {
      setBusy(false);
    }
  }

  async function doRevoke() {
    if (!window.confirm(d.key_revoke_confirm)) return;
    setBusy(true);
    try {
      await revokeAndRotate();
      const { fingerprint: fp } = await ensureSigningKey();
      setFingerprint(fp);
      setMessage(d.key_revoke_ok);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <div className="grouph" style={{ margin: "0 0 0.3rem" }}>{d.key_h}</div>
      <p className="nopos" style={{ margin: "0 0 0.5rem" }}>{d.key_p}</p>
      {fingerprint && (
        <p className="nopos" style={{ margin: "0 0 0.5rem" }}>
          <code>{d.key_fingerprint_label}: {fingerprint}</code>
        </p>
      )}
      {message && <p className="nopos" style={{ margin: "0 0 0.5rem" }}>{message}</p>}

      {anomalies.map((a) => (
        <div key={a.id} className="disclosure" style={{ marginBottom: "0.6rem" }}>
          <span className="tag">?</span>
          <span>
            {d.key_anomaly_banner}
            <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
              <button
                className="btn secondary"
                style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }}
                disabled={busy}
                onClick={() => acknowledgeAnomaly(a.id)}
              >
                {d.key_anomaly_yes}
              </button>
              <button
                className="btn secondary"
                style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }}
                disabled={busy}
                onClick={() => anomalyNotMe(a.id)}
              >
                {d.key_anomaly_no}
              </button>
            </span>
          </span>
        </div>
      ))}

      {mode === "idle" && (
        <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button className="btn secondary" style={{ width: "auto" }} onClick={() => setMode("export")}>
            {d.key_export_btn}
          </button>
          <button className="btn secondary" style={{ width: "auto" }} onClick={() => setMode("import")}>
            {d.key_import_btn}
          </button>
          <button className="btn secondary" style={{ width: "auto" }} disabled={busy} onClick={doRevoke}>
            {d.key_revoke_btn}
          </button>
        </span>
      )}

      {mode === "export" && (
        <>
          <p className="nopos" style={{ margin: "0 0 0.4rem" }}>{d.key_export_p}</p>
          <input
            type="password"
            className="statement"
            style={{ minHeight: 0 }}
            placeholder={d.key_passphrase_ph}
            aria-label={d.key_passphrase_ph}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button
            className="btn"
            style={{ marginTop: "0.5rem" }}
            disabled={busy || passphrase.length < 8}
            onClick={doExport}
          >
            {d.key_export_go}
          </button>
        </>
      )}

      {mode === "import" && (
        <>
          <label style={{ display: "block", fontSize: "0.85rem", margin: "0 0 0.3rem" }}>
            {d.key_import_file_label}
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: "block", marginTop: "0.3rem" }}
            />
          </label>
          <input
            type="password"
            className="statement"
            style={{ minHeight: 0 }}
            placeholder={d.key_passphrase_ph}
            aria-label={d.key_passphrase_ph}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button
            className="btn"
            style={{ marginTop: "0.5rem" }}
            disabled={busy || !file || passphrase.length === 0}
            onClick={doImport}
          >
            {d.key_import_go}
          </button>
        </>
      )}
    </div>
  );
}
