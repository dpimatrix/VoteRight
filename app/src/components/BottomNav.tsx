"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { langFrom, t } from "@/lib/i18n";

const ICONS = {
  ballot: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 21V9l8-6 8 6v12" />
      <path d="M9 21v-7h6v7" />
    </svg>
  ),
  prios: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.2" fill="var(--surface)" />
      <circle cx="15" cy="12" r="2.2" fill="var(--surface)" />
      <circle cx="7" cy="17" r="2.2" fill="var(--surface)" />
    </svg>
  ),
  matches: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </svg>
  ),
  debates: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  ),
};

export function BottomNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = langFrom(params.get("lang") ?? undefined);
  const d = t(lang);
  const items = [
    { href: `/?lang=${lang}`, label: d.nav_ballot, icon: ICONS.ballot, match: (p: string) => p === "/" },
    { href: `/priorities?lang=${lang}`, label: d.nav_prios, icon: ICONS.prios, match: (p: string) => p.startsWith("/priorities") },
    {
      href: `/matches?lang=${lang}`,
      label: d.nav_matches,
      icon: ICONS.matches,
      match: (p: string) => p.startsWith("/matches") || p.startsWith("/candidates"),
    },
    {
      href: `/debates?lang=${lang}`,
      label: d.nav_debates,
      icon: ICONS.debates,
      match: (p: string) => p.startsWith("/debates") || p.startsWith("/verify"),
    },
  ];
  return (
    <nav className="bottomnav" aria-label="Main">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className={it.match(pathname) ? "active" : ""}>
          {it.icon}
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
