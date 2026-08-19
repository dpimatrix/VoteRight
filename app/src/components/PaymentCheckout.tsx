"use client";

import { useState } from "react";

/* Payment-as-verification checkout (2026-08-19). Loads whichever gateway's
   JS is actually active via a plain <script> tag rather than an npm client
   SDK -- both Stripe.js and Authorize.Net's Accept.js are meant to be
   loaded straight from the vendor's own CDN (not bundled) so their
   tokenization code is always the vendor's current, unmodified version.
   Neither a raw card number nor a bank account number ever reaches
   VoteRight's own server or client bundle -- only the token each vendor's
   script hands back.

   NOT YET TESTED against real gateway credentials -- verify end-to-end
   once real (even sandbox) keys are configured in /admin/payments. */

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
        create: (type: string) => { mount: (el: string | HTMLElement) => void };
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
        setTimeout(() => mountStripe(data), 0);
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

  function mountStripe(s: Extract<StartResult, { gateway: "stripe" }>) {
    if (!window.Stripe) return;
    const stripe = window.Stripe(s.publishableKey);
    const elements = stripe.elements({ clientSecret: s.clientSecret });
    elements.create("payment").mount("#payment-element");
    const form = document.getElementById("stripe-payment-form");
    form?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      setStatus("processing");
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/verify/payment?lang=${lang}&submitted=1` },
      });
      if (confirmError) {
        setError(confirmError.message);
        setStatus("error");
      }
      // On success Stripe redirects to return_url itself -- nothing else to do here.
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
        <button className="btn" type="submit" style={{ marginTop: "0.7rem" }}>{labels.fee}</button>
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
