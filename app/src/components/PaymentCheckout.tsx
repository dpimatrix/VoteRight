"use client";

import { useEffect, useRef, useState } from "react";

/* Payment-as-verification checkout (2026-08-19). Loads whichever gateway's
   JS is actually active via a plain <script> tag rather than an npm client
   SDK -- both Stripe.js and Authorize.Net's Accept.js are meant to be
   loaded straight from the vendor's own CDN (not bundled) so their
   tokenization code is always the vendor's current, unmodified version.
   Neither a raw card number nor a bank account number ever reaches
   VoteRight's own server or client bundle -- only the token each vendor's
   script hands back.

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

type StartResult =
  | { gateway: "stripe"; recordId: string; feeCents: number; clientSecret: string; publishableKey: string }
  | { gateway: "authorizenet"; recordId: string; feeCents: number; apiLoginId: string; publicClientKey: string; environment: "sandbox" | "production" };

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
          on: (event: "ready", handler: () => void) => void;
        };
      };
      confirmPayment: (opts: { elements: unknown; confirmParams: { return_url: string } }) => Promise<{ error?: { message: string } }>;
    };
    Accept?: {
      dispatchData: (
        req: { authData: { clientKey: string; apiLoginID: string }; cardData?: unknown; bankData?: unknown },
        cb: (res: { messages: { resultCode: string; message: { text: string }[] }; opaqueData: { dataDescriptor: string; dataValue: string } }) => void,
      ) => void;
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
  // Guards against double-mounting Elements into the same DOM node -- the
  // effect below re-runs if status/start ever change again (they don't in
  // practice once "form" is reached for a given start, but this makes that
  // an explicit guarantee rather than an assumption), and React's own
  // StrictMode double-invokes effects once in dev.
  const mountedRef = useRef(false);

  async function begin() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/payment-verification/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "error");
      setStart(data as StartResult);
      if (data.gateway === "stripe") {
        await loadScript("https://js.stripe.com/v3/");
        setStatus("form");
        // mountStripe() itself runs from the effect below, once the
        // #payment-element div this status transition renders actually
        // exists in the DOM -- see this file's own header comment.
      } else {
        await loadScript(
          data.environment === "production" ? "https://js.authorize.net/v1/Accept.js" : "https://jstest.authorize.net/v1/Accept.js",
        );
        setStatus("form");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status !== "form" || !start || start.gateway !== "stripe" || mountedRef.current) return;
    mountedRef.current = true;
    mountStripe(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mountStripe closes
    // over lang (stable prop) and setStatus/setError (stable setters); listing it
    // would need wrapping in useCallback for no behavioral benefit here.
  }, [status, start]);

  function mountStripe(s: Extract<StartResult, { gateway: "stripe" }>) {
    if (!window.Stripe) return;
    const stripe = window.Stripe(s.publishableKey);
    const elements = stripe.elements({ clientSecret: s.clientSecret });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
    paymentElement.on("ready", () => {
      readyRef.current = true;
      setElementReady(true);
    });
    const form = document.getElementById("stripe-payment-form");
    form?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      // Defense in depth alongside the disabled button below -- a native
      // form can still submit via Enter inside a non-Stripe field on the
      // same form, bypassing a disabled submit button entirely.
      if (!readyRef.current) return;
      setStatus("processing");
      try {
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
        // Real bug found live testing 2026-09-04, reproduced with Link
        // disabled (ruling that out as the cause): confirmPayment() can
        // REJECT rather than resolve with { error } when the Payment
        // Element hasn't actually finished initializing yet -- "IntegrationError:
        // We could not retrieve data from the specified Element... make
        // sure it is mounted and the ready event has been emitted." The
        // readyRef guard above should prevent this from being reachable at
        // all now; this catch stays as a safety net for whatever else
        // could make confirmPayment reject rather than resolve. With no
        // catch here, that became an uncaught promise rejection and
        // setStatus("processing") never got reset -- the resident was
        // stuck on "Processing..." forever with no way to recover except
        // reloading the page, and the charge never actually completed
        // either way.
        console.error("confirmPayment rejected:", e);
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    });
  }

  async function submitAuthorizeNetCard(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!start || start.gateway !== "authorizenet" || !window.Accept) return;
    setStatus("processing");
    const form = ev.currentTarget;
    const cardNumber = (form.elements.namedItem("cardNumber") as HTMLInputElement).value;
    const month = (form.elements.namedItem("month") as HTMLInputElement).value;
    const year = (form.elements.namedItem("year") as HTMLInputElement).value;
    const cardCode = (form.elements.namedItem("cardCode") as HTMLInputElement).value;
    window.Accept.dispatchData(
      {
        authData: { clientKey: start.publicClientKey, apiLoginID: start.apiLoginId },
        cardData: { cardNumber, month, year, cardCode },
      },
      async (response) => {
        if (response.messages.resultCode !== "Ok") {
          setError(response.messages.message.map((m) => m.text).join(" "));
          setStatus("error");
          return;
        }
        const res = await fetch("/api/payment-verification/charge-authorizenet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: start.recordId,
            dataDescriptor: response.opaqueData.dataDescriptor,
            dataValue: response.opaqueData.dataValue,
          }),
        });
        const result = await res.json();
        if (result.status === "succeeded") {
          window.location.href = `/verify/payment?lang=${lang}&submitted=1`;
        } else {
          setError(result.message ?? labels.error);
          setStatus("error");
        }
      },
    );
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

  if (start?.gateway === "stripe") {
    return (
      <form id="stripe-payment-form">
        <div id="payment-element" />
        <button className="btn" type="submit" disabled={!elementReady} style={{ marginTop: "0.7rem" }}>
          {elementReady ? labels.fee : labels.processing}
        </button>
      </form>
    );
  }
  if (start?.gateway === "authorizenet") {
    return (
      <form onSubmit={submitAuthorizeNetCard}>
        <input name="cardNumber" placeholder="Card number" inputMode="numeric" style={{ width: "100%", margin: "0.3rem 0" }} />
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <input name="month" placeholder="MM" inputMode="numeric" style={{ width: "33%" }} />
          <input name="year" placeholder="YYYY" inputMode="numeric" style={{ width: "33%" }} />
          <input name="cardCode" placeholder="CVC" inputMode="numeric" style={{ width: "33%" }} />
        </div>
        <button className="btn" type="submit" style={{ marginTop: "0.7rem" }}>{labels.fee}</button>
      </form>
    );
  }
  return null;
}
