import Link from "next/link";
import { Chev } from "@/components/Chev";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { listProposals, userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DebatesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const proposals = await listProposals();
  const userId = await currentUserId();
  const tier = userId ? await userTier(userId) : "unverified";

  const groups: { key: string; label: string; items: typeof proposals }[] = [
    { key: "debating", label: d.deb_debating, items: proposals.filter((p) => p.status === "debating") },
    { key: "seconding", label: d.deb_seconding, items: proposals.filter((p) => p.status === "seconding") },
    { key: "other", label: d.deb_closed_grp, items: proposals.filter((p) => !["debating", "seconding"].includes(p.status)) },
  ];

  return (
    <>
      <SiteHeader lang={lang} path="/debates" />
      <div className="pagepad">
        <div className="pagetitle">{d.deb_h}</div>
        <p className="sub">{d.deb_p}</p>
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Consultivo" : "Advisory"}</span>
          <span>{d.deb_p}</span>
        </div>
        {tier === "unverified" && (
          <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
        )}
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.key}>
                <div className="grouph">{g.label}</div>
                {g.items.map((p) => (
                  <Link key={p.id} className="seat" href={`/debates/${p.id}?lang=${lang}`}>
                    <span className="seat-ic">{p.topic.slice(0, 2).toUpperCase()}</span>
                    <span className="sname">
                      {p.title}
                      <span className="smeta">
                        {p.status === "seconding"
                          ? `${p.seconds}/${p.second_threshold} ${d.deb_seconds}`
                          : `${p.args} ${d.deb_args}${p.closes ? ` · ${d.deb_closes} ${p.closes}` : ""}`}
                      </span>
                    </span>
                    {p.status === "debating" ? (
                      <span className="chip band b2">{d.deb_debating}</span>
                    ) : p.status === "seconding" ? (
                      <span className="chip band b1">{d.deb_seconding}</span>
                    ) : (
                      <span className="chip band bnull">{p.status}</span>
                    )}
                    <Chev />
                  </Link>
                ))}
              </section>
            ),
        )}
        <Link className="btn" href={`/debates/new?lang=${lang}`} style={{ marginTop: "0.8rem" }}>
          {d.deb_new}
        </Link>
      </div>
    </>
  );
}
