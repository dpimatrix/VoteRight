import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ lang, path }: { lang: Lang; path: string }) {
  const other = lang === "en" ? "es" : "en";
  const d = t(lang);
  return (
    <div className="topbar">
      <Link href={`/?lang=${lang}`} className="wordmark">
        VoteRight<small>{d.county}</small>
      </Link>
      <span className="spacer" />
      <Link
        className="iconbtn"
        href={`${path}${path.includes("?") ? "&" : "?"}lang=${other}`}
        aria-label={d.lang_other}
      >
        {other.toUpperCase()}
      </Link>
      <ThemeToggle />
    </div>
  );
}
