import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

export function SiteHeader({ lang, path }: { lang: Lang; path: string }) {
  const other = lang === "en" ? "es" : "en";
  const d = t(lang);
  return (
    <header className="site">
      <Link href={`/?lang=${lang}`} className="wordmark">
        VoteRight<small>{d.county}</small>
      </Link>
      <Link className="lang" href={`${path}${path.includes("?") ? "&" : "?"}lang=${other}`}>
        {d.lang_other}
      </Link>
    </header>
  );
}
