"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

const DISMISSED_KEY = "voteright_backup_prompt_dismissed";

type D = Pick<Dict, "backup_nudge_h" | "backup_nudge_p" | "backup_nudge_btn" | "backup_nudge_dismiss">;

/* Proactive nudge (2026-08-24) -- the backup/recovery mechanism itself
   (KeySettings.tsx, migration 088) already existed, but nothing ever told
   a user to actually use it: it just sat on /privacy, a page almost nobody
   visits unprompted. Real gap, found live: a reinstall or new device
   silently loses this identity -- priorities, debate history, and now a
   real payment -- with the fix already built and undiscovered. Shown right
   after payment_verified succeeds specifically: that's the moment the
   stakes (a real charge, not just a free address check) are concrete and
   freshest, and the user is already in a "finishing up" frame of mind.

   Dismissal is a plain localStorage flag, not tracked server-side -- there's
   no server-side signal for "did this browser actually complete a backup"
   to begin with (the passphrase and the resulting file both stay
   client-side by design), so this only ever tracks "has this browser seen
   and dismissed the nudge," the same honest scope a client-only flag can
   actually support. Shows again in a genuinely new browser/device, which
   is correct -- that's exactly the case where a backup matters most. */
export function BackupPrompt({ lang, d }: { lang: "en" | "es"; d: D }) {
  const [dismissed, setDismissed] = useState(true); // default hidden until the localStorage check below resolves, avoiding a flash on page load

  useEffect(() => {
    // localStorage can throw in some privacy-mode/storage-restricted
    // browsers -- caught rather than left to bubble into an effect-phase
    // exception (mobile's BackupNudge already does the AsyncStorage
    // equivalent of this; this was the one platform missing it).
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Best-effort -- worst case the nudge reappears next visit, not a
      // functional problem.
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="disclosure" style={{ marginTop: "0.7rem" }}>
      <span className="tag">!</span>
      <span>
        <strong>{d.backup_nudge_h}</strong>
        <br />
        <span style={{ opacity: 0.85 }}>{d.backup_nudge_p}</span>
        <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
          <a
            className="btn secondary"
            style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem", display: "inline-flex", alignItems: "center" }}
            href={`/privacy?lang=${lang}#key-settings`}
            onClick={dismiss}
          >
            {d.backup_nudge_btn}
          </a>
          <button
            className="btn secondary"
            style={{ width: "auto", minHeight: 40, padding: "0.3rem 0.8rem" }}
            onClick={dismiss}
          >
            {d.backup_nudge_dismiss}
          </button>
        </span>
      </span>
    </div>
  );
}
