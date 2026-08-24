"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { Dict, Lang } from "@/lib/i18n";

/* Client component (2026-08-24) -- was a plain <form method="post"
   action="/api/verify">, which meant a full page navigation on submit and
   the typed address gone forever the instant the server redirected, even
   on success. Mobile's /verify already POSTs as JSON and holds the address
   in local state to show a one-time "you just verified: X" confirmation
   (see mobile/src/app/verify.tsx) -- this brings web to the same behavior
   without changing what's actually authoritative: resolveJurisdiction's
   Census geocoder call still happens server-side at submit, exactly as
   before, this only changes how the RESULT gets back to the browser.

   AddressAutocomplete itself is untouched -- still owns its own internal
   `value` state and renders a real <input name="address"> either way (with
   or without a Places API key). Rather than lift that state up (which
   would mean touching a component with real Google Places session-pricing
   reasoning baked into it, see its own header), submit reads the current
   value straight off the DOM via FormData on the form element itself --
   the same thing the browser's own native form-post used to do, just
   triggered from JS instead of a real navigation. */
export function AddressForm({
  lang,
  d,
  submitLabel,
}: {
  lang: Lang;
  d: Dict;
  submitLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set on a successful verify, holding the address just typed -- never
  // sent anywhere beyond the one /api/verify call already made, never
  // stored (resolveJurisdiction only ever persists the resolved
  // jurisdiction, see jurisdictions.ts's own "raw address is still never
  // stored" note). Shown once, this page only, then gone -- the
  // persistent "Verified as X" label elsewhere only ever shows the
  // jurisdiction + verified date, by design (owner's own call,
  // 2026-08-24, over storing the address durably).
  const [justVerified, setJustVerified] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const address = String(new FormData(e.currentTarget).get("address") ?? "");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as {
        outcome: "ok" | "bad_format" | "no_match" | "outside" | "resolver_unavailable";
      };
      if (data.outcome === "ok") {
        setJustVerified(address);
      } else if (data.outcome === "outside") {
        setError(d.verify_outside);
      } else if (data.outcome === "resolver_unavailable") {
        setError(d.verify_unavailable);
      } else {
        // bad_format and no_match share the same "check the address"
        // message, same as the old server-redirect path did.
        setError(d.verify_bad);
      }
    } catch (err) {
      console.error("Verify failed:", err);
      setError(d.verify_network_error);
    } finally {
      setBusy(false);
    }
  }

  if (justVerified) {
    return (
      <div className="card">
        <span className="pill kept">{d.verify_done}</span>
        <p className="nopos" style={{ marginTop: "0.5rem" }}>{justVerified}</p>
        <button className="btn" style={{ marginTop: "0.5rem" }} onClick={() => router.push(`/debates?lang=${lang}`)}>
          {d.continue_btn}
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="nopos">{error}</p>}
      <form className="admform" onSubmit={onSubmit}>
        <AddressAutocomplete placeholder={d.verify_ph} ariaLabel={d.verify_ph} />
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
      </form>
      <div className="privnote">
        <span className="dot" />
        <span>{d.prio_priv}</span>
      </div>
      <p className="nopos" style={{ margin: "0.4rem 0 0" }}>
        <a href={`/privacy?lang=${lang}`}>{d.priv_link}</a>
      </p>
    </>
  );
}
