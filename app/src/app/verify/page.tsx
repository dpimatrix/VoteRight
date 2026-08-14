import { AddressAutocomplete } from "@/components/AddressAutocomplete";
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
        {/* Predictive autocomplete (2026-08-14, owner-approved reversal of
            the original browser-native-only decision below) drives the
            on-screen typing experience only -- production-grade resolution
            still happens server-side at submit exactly as before (US:
            Census Bureau geocoder — official, free, returns the
            county/place geography the resolver needs, plus the Montgomery
            County ArcGIS lookups migration 078 added; EU markets: national
            open address registries, decided per-country in
            EXPANSION-READINESS.md at market entry). Original reasoning for
            starting browser-native-only, kept for context: as-you-type
            services stream partial addresses (plus the user's IP) to a
            vendor before submission, which breaks the §10 posture --
            real testing showed the bare field felt incomplete enough that
            the owner chose to accept that tradeoff. See
            AddressAutocomplete.tsx for the narrow blast-radius design
            (falls back to a plain input with zero third-party calls if
            NEXT_PUBLIC_GOOGLE_PLACES_API_KEY isn't set). */}
        <AddressAutocomplete placeholder={d.verify_ph} ariaLabel={d.verify_ph} />
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
