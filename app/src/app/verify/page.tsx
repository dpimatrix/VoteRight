import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; bad?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const tier = userId ? await userTier(userId) : "unverified";

  return (
    <>
      <SiteHeader lang={lang} path="/verify" />
      <div className="pagepad">
        <div className="pagetitle">{d.verify_h}</div>
        <p className="sub">{d.verify_p}</p>
        {tier !== "unverified" ? (
          <div className="card">
            <span className="pill kept">{d.verify_done}</span>
          </div>
        ) : (
          <div className="card">
            {sp.bad && <p className="nopos">{d.verify_bad}</p>}
            <form className="admform" method="post" action="/api/verify">
              <input type="hidden" name="lang" value={lang} />
              <input type="text" name="address" placeholder={d.verify_ph} aria-label={d.verify_ph} required />
              <button type="submit">{d.verify_btn}</button>
            </form>
            <div className="privnote">
              <span className="dot" />
              <span>{d.prio_priv}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
