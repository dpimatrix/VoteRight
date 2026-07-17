import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";
import { topicsWithAxes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  const userId = await currentUserId();
  const tier = userId ? await userTier(userId) : "unverified";
  const topics = await topicsWithAxes();

  return (
    <>
      <SiteHeader lang={lang} path="/debates/new" />
      <div className="pagepad">
        <div className="pagetitle">{d.deb_new}</div>
        {tier === "unverified" ? (
          <Link className="btn secondary" href={`/verify?lang=${lang}`}>{d.verify_need}</Link>
        ) : (
          <div className="card">
            <form method="post" action="/api/debates" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <input type="hidden" name="lang" value={lang} />
              <label style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                {d.new_topic}
                <select name="topicId" required style={{ display: "block", width: "100%", marginTop: "0.3rem", padding: "0.55rem", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", font: "inherit" }}>
                  {topics.map((tp) => (
                    <option key={tp.topic_id} value={tp.topic_id}>{tp.name}</option>
                  ))}
                </select>
              </label>
              <input type="text" name="title" className="statement" placeholder={d.new_title_ph} aria-label={d.new_title_ph} required minLength={10} style={{ padding: "0.55rem 0.65rem", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", font: "inherit", fontSize: "0.9rem" }} />
              <textarea name="body" className="statement" placeholder={d.new_body_ph} aria-label={d.new_body_ph} required minLength={30} rows={5} />
              <button className="btn" type="submit">{d.new_submit}</button>
            </form>
            <div className="privnote" style={{ marginBottom: 0 }}>
              <span className="dot" style={{ background: "var(--adv)" }} />
              <span>{d.new_pub}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
