import { SiteHeader } from "@/components/SiteHeader";
import { currentUserId } from "@/lib/anon";
import { lastVerifiedAt, userTier } from "@/lib/debates";
import { langFrom, t } from "@/lib/i18n";
import { userResidence } from "@/lib/jurisdictions";

export const dynamic = "force-dynamic";

function AddressForm({
  lang,
  d,
  sp,
  submitLabel,
}: {
  lang: "en" | "es";
  d: ReturnType<typeof t>;
  sp: { bad?: string };
  submitLabel: string;
}) {
  return (
    <>
      {sp.bad === "outside" ? (
        <p className="nopos">{d.verify_outside}</p>
      ) : sp.bad === "unavailable" ? (
        <p className="nopos">{d.verify_unavailable}</p>
      ) : sp.bad ? (
        <p className="nopos">{d.verify_bad}</p>
      ) : null}
      <form className="admform" method="post" action="/api/verify">
        <input type="hidden" name="lang" value={lang} />
        {/* Browser-native autofill only — deliberately NO third-party
            autocomplete: as-you-type services stream partial addresses
            (plus the user's IP) to a vendor before submission, which
            breaks the §10 posture. Production-grade validation happens
            server-side at submit (US: Census Bureau geocoder — official,
            free, returns the county/place geography the resolver needs;
            EU markets: national open address registries, decided
            per-country in EXPANSION-READINESS.md at market entry). */}
        <input type="text" name="address" autoComplete="street-address" placeholder={d.verify_ph} aria-label={d.verify_ph} required />
        <button type="submit">{submitLabel}</button>
      </form>
      <div className="privnote">
        <span className="dot" />
        <span>{d.prio_priv}</span>
      </div>
      <p className="nopos" style={{ margin: "0.4rem 0 0" }}>
        <a href={`/privacy?lang=${lang}`}>{d.priv_link}</a>
      </p>
    </>
  );
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; bad?: string; change?: string }>;
}) {
  const sp = await searchParams;
  const lang = langFrom(sp.lang);
  const d = t(lang);
  const userId = await currentUserId();
  const tier = userId ? await userTier(userId) : "unverified";
  const alreadyVerified = tier !== "unverified";
  const [residence, verifiedAt] = alreadyVerified
    ? await Promise.all([userResidence(userId!), lastVerifiedAt(userId!)])
    : [null, null];

  return (
    <>
      <SiteHeader lang={lang} path="/verify" />
      <div className="pagepad">
        <div className="pagetitle">{d.verify_h}</div>
        <p className="sub">{d.verify_p}</p>
        {alreadyVerified ? (
          sp.change === "1" ? (
            <div className="card">
              <p className="nopos">
                {d.verify_current} <strong>{residence?.name ?? "?"}</strong>
                {verifiedAt ? ` (${d.verify_since} ${verifiedAt.toLocaleDateString(lang === "es" ? "es" : "en-US")})` : ""}
              </p>
              <p className="nopos" style={{ opacity: 0.8 }}>{d.verify_change_warn}</p>
              <AddressForm lang={lang} d={d} sp={sp} submitLabel={d.verify_confirm_btn} />
            </div>
          ) : (
            <div className="card">
              <span className="pill kept">{d.verify_done}</span>
              <p className="nopos" style={{ marginTop: "0.5rem" }}>
                {d.verify_current} <strong>{residence?.name ?? "?"}</strong>
                {verifiedAt ? ` — ${d.verify_since} ${verifiedAt.toLocaleDateString(lang === "es" ? "es" : "en-US")}` : ""}
              </p>
              <a className="btn secondary" href={`/verify?lang=${lang}&change=1`} style={{ marginTop: "0.5rem", display: "inline-block" }}>
                {d.verify_change_btn}
              </a>
            </div>
          )
        ) : (
          <div className="card">
            <AddressForm lang={lang} d={d} sp={sp} submitLabel={d.verify_btn} />
          </div>
        )}
      </div>
    </>
  );
}
