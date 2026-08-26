"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* A small client island inside the otherwise-server-rendered SiteHeader --
   avoids threading an unread count as a prop through every single page
   that renders SiteHeader (a real, wide footprint) just to show a badge.
   Reads /api/notifications directly, which uses the request's own cookie
   automatically -- no props needed at all. */
export function NotificationBell({ lang, label }: { lang: string; label: string }) {
  const [unread, setUnread] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d: { unread: number }) => {
        if (!cancelled) setUnread(d.unread);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Link className="iconbtn" href={`/notifications?lang=${lang}`} aria-label={label} style={{ position: "relative" }}>
      🔔
      {!!unread && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
            background: "var(--adv)", color: "#fff", fontSize: "0.62rem", lineHeight: "14px",
            textAlign: "center", padding: "0 3px",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
