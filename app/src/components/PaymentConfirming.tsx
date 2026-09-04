"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* Bridges the gap between Stripe's client-side redirect (instant, the
   moment the charge succeeds) and our own payment_verified promotion
   (async, off a separate webhook -- see paymentVerification.ts's own
   comment on why). Rendered only when the page's own server-side tier
   check ran before the webhook landed -- see /verify/payment/page.tsx's
   ?submitted=1 branch. router.refresh() re-runs that server check on
   each attempt rather than this component tracking tier itself, so the
   moment it succeeds, the real success screen (with its own donation
   tiles, BackupNudge, etc.) renders exactly as it would on any other
   fresh load -- no separate "confirmed!" state to keep in sync here. */
export function PaymentConfirming({ label, stillLabel }: { label: string; stillLabel: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  // 8 tries * 1.5s = 12s -- a hair past mobile's own 5*1.5s=7.5s poll
  // window for the same webhook, since a full page refresh here costs
  // more round-trip time per attempt than mobile's plain fetch.
  const MAX_TRIES = 8;

  useEffect(() => {
    if (tries >= MAX_TRIES) return;
    const timer = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries]);

  return <p className="nopos">{tries >= MAX_TRIES ? stillLabel : label}</p>;
}
