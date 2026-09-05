"use client";

import { useEffect, useRef, useState } from "react";

/* Payment-as-verification checkout (2026-08-19). Loads Stripe.js via a
   plain <script> tag rather than an npm client SDK -- Stripe.js is meant to
   be loaded straight from Stripe's own CDN (not bundled) so its
   tokenization code is always Stripe's current, unmodified version. A raw
   card number never reaches VoteRight's own server or client bundle --
   only the token Stripe's script hands back.

   Used to also support Authorize.Net (Accept.js, loaded the same way, plus
   its own card-form JSX and submitAuthorizeNetCard()) -- removed along
   with the rest of Authorize.Net support (2026-09-05, migration 102); see
   paymentVerification.ts's own header comment for why.

   Real bug found live testing 2026-09-04 (first real end-to-end test this
   flow ever got -- see the removed "NOT YET TESTED" note this comment used
   to end with): mountStripe() used to be invoked via
   setTimeout(() => mountStripe(data), 0) right after setStatus("form"),
   on the theory that a 0ms timeout would fire after React re-rendered and
   the #payment-element div existed in the DOM. That's not a guarantee --
   under React 19's scheduler, a macrotask can fire before the commit that
   creates the div, and Stripe's own elements.create().mount("#payment-
   element") throws when the selector matches nothing: "Uncaught
   IntegrationError: The selector you specified (#payment-element) applies
   to no DOM elements that are currently on the page." Uncaught, so it
   never even reached this component's own catch/setStatus("error") --
   from the resident's side, clicking "Pay to verify" just silently did
   nothing (server-side PaymentIntent creation had already succeeded by
   this point, confirmed against Stripe's own dashboard -- Payment method:
   None, Incomplete -- the resident just never saw a card form to fill in
   at all). useEffect is the actual guarantee here: React only runs effects
   after the DOM has committed for that render, unlike a raw timeout. */

type StartResult = { recordId: string; feeCents: number; clientSecret: string; publishableKey: string };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

declare global {
  interface Window {
    Stripe?: (key: string) => {
      elements: (opts: { clientSecret: string }) => {
        create: (type: string) => {
          mount: (el: string | HTMLElement) => void;
          on(event: "ready", handler: () => void): void;
          on(event: "change", handler: (e: { complete: boolean }) => void): void;
        };
        submit: () => Promise<{ error?: { message: string } }>;
      };
      confirmPayment: (opts: { elements: unknown; confirmParams: { return_url: string } }) => Promise<{ error?: { message: string } }>;
    };
  }
}

export function PaymentCheckout({
  lang,
  labels,
}: {
  lang: "en" | "es";
  labels: { fee: string; startBtn: string; checkBtn: string; processing: string; error: string; checkInstructionsLabel: string };
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "form" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<StartResult | null>(null);
  // Real bug found live testing 2026-09-04, reproduced with Link disabled
  // -- ruling out Link's own popup/iframe activity as the cause: the
  // Payment Element's mount() call starts an async load (its own iframe,
  // fetched over the network) and doesn't finish being usable the instant
  // mount() returns -- Stripe's own elements.create("payment") emits a
  // 'ready' event once it actually has usable data. The submit button was
  // never gated on that, so clicking "Pay" before the iframe finished
  // initializing hit exactly the error confirmPayment's own catch (below)
  // now recovers from instead of hanging forever: "We could not retrieve
  // data from the specified Element... make sure it is mounted and the
  // ready event has been emitted." elementReady drives the button's
  // disabled state (needs a re-render to reach the DOM); readyRef is the
  // same fact read inside the submit handler's closure, which captured
  // elementReady's value at mount time (always false) and would otherwise
  // see a permanently stale "not ready" -- refs read live, state doesn't.
  const [elementReady, setElementReady] = useState(false);
  const readyRef = useRef(false);
  // Real gap found live testing 2026-09-04, after the ready-gating above
  // and elements.submit() both turned out insufficient on their own: the
  // resident's own PaymentIntent showed only its creation event, nothing
  // else, on every single failed attempt -- confirming the failure never
  // even reached Stripe's servers, a purely client-side collection
  // failure. 'ready' only means the Element finished loading its shell;
  // it says nothing about whether the currently-entered card data is
  // actually valid and internally settled yet. Mobile's native CardField
  // already tracks this correctly via its own onCardChange's `complete`
  // flag (see verify-payment.tsx) -- ported the same idea to web via the
  // Payment Element's 'change' event, which is Stripe's own documented
  // way to know the currently-selected payment method's fields are fully,
  // validly filled in and settled, not just present.
  const [elementComplete, setElementComplete] = useState(false);
  const completeRef = useRef(false);
  // Real bug found live testing 2026-09-04, after ready-gating,
  // elements.submit(), and completeness-gating (PRs #56-58) ALL turned out
  // insufficient on their own, with the identical error persisting across
  // every single retry regardless: this was a stale-mount bug, not a
  // confirmation-step bug at all, which is why nothing done inside the
  // submit handler ever fixed it. Retrying after an error calls begin()
  // again in the SAME component instance (onClick={begin} on both the
  // idle AND error-state buttons -- neither reloads the page), fetching a
  // genuinely new clientSecret each time. But a plain useRef(false) guard
  // only tracks "has mountStripe ever run", not "for which start" -- once
  // true, it stayed true forever, so every retry after the very first
  // attempt silently kept reusing attempt #1's already-exhausted Stripe
  // Elements instance (tied to attempt #1's now-stale clientSecret)
  // instead of ever mounting a fresh one for the new PaymentIntent --
  // exactly matching why the error was 100% identical and 100% persistent
  // across dozens of retries no matter what changed inside mountStripe
  // itself. Tracking WHICH start object was mounted (object identity,
  // not a boolean) means a genuinely new start from a fresh begin() call
  // always triggers a fresh mount.
  const mountedForRef = useRef<StartResult | null>(null);

  async function begin() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/payment-verification/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "error");
      setStart(data as StartResult);
      await loadScript("https://js.stripe.com/v3/");
      setStatus("form");
      // mountStripe() itself runs from the effect below, once the
      // #payment-element div this status transition renders actually
      // exists in the DOM -- see this file's own header comment.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status !== "form" || !start || mountedForRef.current === start) return;
    mountedForRef.current = start;
    readyRef.current = false;
    completeRef.current = false;
    setElementReady(false);
    setElementComplete(false);
    mountStripe(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mountStripe closes
    // over lang (stable prop) and setStatus/setError (stable setters); listing it
    // would need wrapping in useCallback for no behavioral benefit here.
  }, [status, start]);

  function mountStripe(s: StartResult) {
    if (!window.Stripe) return;
    const stripe = window.Stripe(s.publishableKey);
    const elements = stripe.elements({ clientSecret: s.clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
    paymentElement.on("ready", () => {
      readyRef.current = true;
      setElementReady(true);
    });
    paymentElement.on("change", (e) => {
      completeRef.current = e.complete;
      setElementComplete(e.complete);
    });
    const form = document.getElementById("stripe-payment-form");
    // Assigning .onsubmit rather than addEventListener("submit", ...) is
    // deliberate: mountStripe() now genuinely runs again on every retry
    // (see mountedForRef's own comment), and this <form> DOM node is
    // REUSED across retries (same position in the same conditional branch,
    // so React never actually recreates it). addEventListener would have
    // stacked a second listener on top of the first retry's, leaving BOTH
    // the old (closed over the now-stale, already-exhausted first
    // clientSecret/elements) and new listeners firing on a single submit
    // -- itself a very plausible contributor to this exact class of
    // error. Assigning .onsubmit replaces any previous handler outright.
    if (form) form.onsubmit = async (ev) => {
      ev.preventDefault();
      // Defense in depth alongside the disabled button below -- a native
      // form can still submit via Enter inside a non-Stripe field on the
      // same form, bypassing a disabled submit button entirely.
      if (!readyRef.current || !completeRef.current) return;
      setStatus("processing");
      try {
        // Real root cause found live testing 2026-09-04, after the ready-
        // event gating above turned out NOT to fix "IntegrationError: We
        // could not retrieve data from the specified Element... make sure
        // it is mounted and the ready event has been emitted" -- confirmed
        // reproducible in a completely fresh incognito session (no
        // extensions, no Link, no stale mount state) with the button
        // genuinely showing as ready/clickable at the moment of the click.
        // The actual issue: confirmPayment() needs elements.submit() called
        // and AWAITED first -- that's the step that actually validates the
        // form and collects the entered card data from the Element; ready
        // only means the Element finished loading, not that its data has
        // been collected. This code never called it at all. Per Stripe's
        // own docs, omitting (or not awaiting) elements.submit() before
        // confirmPayment is exactly what produces this error.
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message);
          setStatus("error");
          return;
        }
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: `${window.location.origin}/verify/payment?lang=${lang}&submitted=1` },
        });
        if (confirmError) {
          setError(confirmError.message);
          setStatus("error");
        }
        // On success Stripe redirects to return_url itself -- nothing else to do here.
      } catch (e) {
        // Real bug found live testing 2026-09-04: confirmPayment() (or
        // elements.submit() above) can REJECT rather than resolve with
        // { error }. With no catch here, that became an uncaught promise
        // rejection and setStatus("processing") never got reset -- the
        // resident was stuck on "Processing..." forever with no way to
        // recover except reloading the page, and the charge never actually
        // completed either way.
        console.error("Payment confirmation rejected:", e);
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    };
  }

  if (status === "idle") {
    return (
      <button className="btn" onClick={begin}>
        {labels.startBtn}
      </button>
    );
  }
  if (status === "loading") return <p className="nopos">{labels.processing}</p>;
  if (status === "error") {
    return (
      <>
        <p className="nopos" style={{ color: "var(--differ)" }}>{error ?? labels.error}</p>
        <button className="btn secondary" onClick={begin}>{labels.startBtn}</button>
      </>
    );
  }
  if (status === "processing") return <p className="nopos">{labels.processing}</p>;

  if (start) {
    return (
      <form id="stripe-payment-form">
        <div id="payment-element" />
        <button className="btn" type="submit" disabled={!elementReady || !elementComplete} style={{ marginTop: "0.7rem" }}>
          {elementReady ? labels.fee : labels.processing}
        </button>
      </form>
    );
  }
  return null;
}
