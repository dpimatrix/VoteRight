# VoteRight — Backlog

Durable list of known, open items that are **not** being silently forgotten —
distinct from ARCHITECTURE.md §13 (open questions specifically needing
counsel) and DATA-OPS.md (how the ingestion pipeline runs today). Add a dated
entry when something real gets deferred instead of only mentioning it in a
chat; remove/close out an item here the same session it actually ships,
rather than letting this drift out of sync with reality.

## Membership & sustainability funding (§14, built 2026-08-19)

- ~~Not yet tested against live Stripe Billing credentials~~ **DONE
  (2026-08-19)** — full live run: 3 Products/Prices created (one early
  mix-up pasting a Product ID instead of a Price ID into
  `/admin/subscriptions`, caught and corrected), a real live $5 Supporter
  charge went through, refunded afterward. **Two real bugs found and fixed
  in the process**: (1) the subscriptions webhook destination was never
  actually created on Stripe's side (only the one-time payment_verified
  destination existed) — the charge succeeded but VoteRight never heard
  about it until the destination was added; (2) `checkout`/`portal` routes
  built their Stripe return URLs from `request.url`'s origin directly,
  reproducing the exact "redirects to localhost:3001" bug this project
  already fixed once (2026-08-14) — fixed by routing both through the
  existing `redirectTo()`/`SITE_URL` mechanism via a new shared
  `siteOrigin()` helper. Webhook now correctly configured and receiving
  events.
- ~~KYC / user accounts for subscribers~~ **RESOLVED, not needed
  (2026-08-19)** — owner raised a real concern (KYC compliance,
  transaction-history delivery, year-end statements) after going through
  the live-checkout debugging above. Researched rather than assumed: KYC
  is Stripe's obligation toward the account holder (already satisfied when
  the Stripe account itself was set up), not something VoteRight owes its
  own subscribers — that only applies when using Stripe Connect to onboard
  other merchants, which this isn't. Transaction history and receipts are
  solved without any new accounts system: Stripe's own "Successful
  payments" + "Refunds" customer-email toggles (Dashboard → Settings →
  Customer emails) now send a receipt automatically on every charge, and
  the Billing Portal already wired into `/subscribe` gives self-service
  invoice history any time — both confirmed live. **Still genuinely open,
  but small and separable**: a rolled-up *annual* statement (vs. 12
  per-charge receipts) would need either a manual admin export or a real
  email vendor, and only clearly matters if the still-undecided nonprofit
  question (ARCHITECTURE.md §13 item 2) resolves toward 501(c)(3) status.
- **Deferred by design, needing their own decisions** — see
  ARCHITECTURE.md §14.2 for the full reasoning: personalized digest
  emails/notifications and annual giving statements (needs a transactional
  email vendor, not yet chosen — receipts themselves are solved via
  Stripe's native emails above, this is only for anything beyond
  per-charge receipts), a follow/bookmark system with a tier-gated cap (no
  such feature exists at all yet, not just an ungated one), per-person
  alignment-history analytics (no historical snapshot table exists), a
  dedicated priority-support queue (a staffing commitment, not something
  to fake with a cosmetic flag).
- **The bulk API export (`/api/v1/export/candidates`) is deliberately
  v1-scoped** — name/party/current office/jurisdiction only. Promises,
  voting records, sponsorships, and outside money each have their own
  shape and aren't squeezed into this endpoint; a real second pass if
  Champion subscribers actually want those.

## Security / trust model

- ~~`govt_id_verified` identity tier~~ **SUPERSEDED 2026-08-19** — owner
  rejected document-based ID verification outright (no free tier exists at
  either vendor, confirmed live) and chose payment-as-verification instead:
  `payment_verified` (migration 085), gating debate participation on a
  successful card/ACH/check payment rather than an ID document. See
  ARCHITECTURE.md §9.2 for the full design and its own honest tradeoffs
  (this doesn't fully close the Sybil gap either — see the new admin-roles
  item below and the "not yet tested against live credentials" note in
  that section).
- ~~Payment verification: needs real credentials to test end-to-end~~
  **DONE for Stripe (2026-08-19)** — owner provided real Stripe test-mode
  keys, verified the full flow against the live test API (PaymentIntent
  creation → confirm with a test card → signed webhook → `payment_verified`
  promotion). **Caught and fixed a real bug in the process**: the webhook
  handler was misclassifying every successful payment as `'ach'` regardless
  of whether a card or bank account was actually used (checked the
  PaymentIntent's *allowed* method types, not which one was actually
  charged) — fixed by retrieving the real `PaymentMethod.type`. Owner chose
  Stripe over Authorize.Net as the gateway to actually go live with (same
  per-transaction rate, no $25/mo base fee, confirmed live against both
  vendors' own pricing pages) — Authorize.Net stays fully built and
  selectable if that ever changes. **Still not done**: production has no
  Stripe keys configured yet (`/admin/payments`, self-serve, needs a real
  or separate production Stripe account — the keys used for this test are
  test-mode only); Authorize.Net itself remains completely untested against
  any live account.
- ~~Live production Stripe keys~~ **DONE (2026-08-19)** — owner set up a
  live Stripe webhook destination, confirmed it responds (200 via Stripe's
  own "Send test webhook"), and saved live keys + fee into `/admin/payments`
  on the real production console. **A second real bug was found and fixed
  along the way**: the fee field silently no-op'd on a blank submission
  (same "leave blank = keep current" semantics as the vendor key fields,
  wrong for a field with no valid unset state) — `fee_cents` stayed NULL
  with zero visible error until traced via a direct `psql` query. Fixed
  (client `required` + server-side 400 on blank/invalid), deployed, and
  confirmed live: `/admin/payments` now correctly reads "Fee: $5.00 ·
  active gateway: stripe." **Payment verification is fully live in
  production as of this note** — the only remaining item is the mobile gap
  directly below, and Authorize.Net remaining untested against any live
  account (not the near-term priority per the owner's gateway choice).
- ~~Mobile app not updated for payment_verified gating~~ **DONE (2026-08-19,
  commits `12dac58`/`5464102`)** — mobile's `post()`/`get()` now expose the
  parsed JSON error body (`errorCode()` helper) instead of swallowing it;
  every debate-action screen's UI gate changed from the loose
  `tier !== 'unverified'` to `tier === 'payment_verified'`, routing to
  `/verify` or the new native `/verify-payment` screen based on tier,
  matching web's `verifiedUserId()`/`paymentVerifiedUserId()` split exactly.
  `/verify-payment` does real in-app card payment via
  `@stripe/stripe-react-native` (a new native dependency — Authorize.Net has
  no native SDK path, shown as an honest "not available in the app yet"
  state) plus mail-in check (no payment SDK needed). New backend pieces:
  `GET /api/payment-verification/config` (public-safe fee/gateway
  allowlist) and JSON mode on `/api/payment-verification/check`. Verified
  live against a real running dev server. **Not yet in a shipped build** —
  needs a new EAS build + App Store/Play Store review cycle on both
  platforms (native module, not OTA-updatable) before it reaches real
  users.
- ~~Admin role-based access control~~ **DONE (2026-08-19, migration 086)**
  — per-admin accounts (own TOTP enrollment each) + per-screen checkboxes
  (owner's explicit choice over named roles), replacing the flat shared-
  TOTP login across all 11 admin screens. `/admin/admin-accounts` manages
  it. See ARCHITECTURE.md §10.3. **Real deploy-order gotcha documented in
  DEPLOY.md — `db/bootstrap-admin.mjs` MUST run immediately after migration
  086 on the next production deploy**, or every admin screen locks with no
  way back in through the app.
- **Device fingerprint correlation** — the third leg of §9's anomaly-detection
  design, deliberately deferred rather than built weakly. Real vendor-cost/
  privacy tradeoff (a proper fingerprinting SDK) similar in shape to
  `govt_id_verified`; no free/self-contained equivalent to `geoip-lite` was
  identified for this leg.
- **Origin firewall lockdown** — restrict the VPS's public port to
  Cloudflare's published IP ranges so the origin can't be reached directly,
  bypassing Cloudflare's protection. Needs root. Also needs confirming
  whether Safariis (the other app sharing this VPS) is also fully behind
  Cloudflare before applying a blanket rule — a rule scoped only to
  VoteRight's own vhost is safer if not.
- **General rate limiting on text arguments/proposals/seconds** — an older,
  pre-existing gap (predates the 2026-08-15 anomaly-detection work) covering
  plain content-spam volume, not the coordinated-manipulation shape §9
  targets. Still not built.

## Dependency hygiene

- **`npm audit`: 6 pre-existing high-severity findings** — `brace-expansion`,
  `js-yaml`, `nanoid`, `next` (9 separate CVEs at the pinned 16.2.10),
  `postcss`, `sharp`. Surfaced installing `geoip-lite` 2026-08-15 but not
  caused by it. Deliberately not touched this session — `npm audit fix
  --force` would bump Next.js to an out-of-range major version as a side
  effect. Needs its own dedicated, carefully-tested pass (full regression
  suite + a real staging deploy before production), not a reflexive `--force`.
- ~~Stray root-level `package-lock.json`~~ **DONE (2026-08-16)** — deleted
  from the VPS (`rm /home/voteright/repo/package-lock.json`). Had caused
  Next's "detected multiple lockfiles" warning on every build and was the
  root cause of one deploy-troubleshooting detour 2026-08-15 (an `npm
  install` run from repo root instead of `app/` partially succeeded against
  the wrong lockfile before the mistake was caught).

## Officeholder photo coverage

- **13 ambiguous-name flagged candidates**, skipped by
  `statewide-official-photos-flagged.mjs` because the loose Wikidata match
  found >1 distinct person for the name — need manual per-person
  disambiguation (check the specific Wikidata item + photo against the real
  officeholder, the same way the 4 confirmed wrong-person matches were
  caught): Tim Griffin (AR AG), William Tong (CT AG), Chris Carr (GA AG),
  Alan Wilson (SC AG), Derek Brown (UT AG), Nick Brown (WA AG), Joe Kelly (NE
  Lt. Gov), Michael Adams (KY SoS), Steve Simon (MN SoS), Mark Hammond (SC
  SoS), Dave Young (CO Treasurer), Mark Metcalf (KY Treasurer), John Fleming
  (LA Treasurer).
- **55 people confirmed to have no Wikidata photo at all** for this office
  tier — a real ceiling for Wikidata as the sole source. Most promising next
  source, researched but not built: NAAG's "Find my AG" directory has all 50
  states in one consistent scrapeable format (confirmed live 2026-08-14);
  NASS/NAST/NASACT would need the same per-association format check before
  assuming they're equally uniform.
- **Remaining nationwide photo tiers not yet started**: Public Service
  Commissioners (~37), State Supreme Courts (~229), State Boards of Education
  (~100), Tier-C commissioners (~39), staggered state senates (~1,000+),
  intermediate appellate courts (~550), smaller niche/mop-up tiers (~40
  combined).
- **Photo renewal on turnover** — `congress.mjs`/`openstates-legislature.mjs`
  now correctly retire `office_terms.term_end`/`current_office_id` when an
  incumbent leaves (fixed 2026-08-15, runs monthly via
  `roster-refresh.timer`), but nothing yet re-triggers a photo fetch for the
  *new* incumbent who fills that seat — the photo pipeline is a separate,
  manually-run script (`statewide-official-photos.mjs`, no schedule).
  Options not yet chosen between: fold a photo lookup into
  `roster-refresh.sh` itself, or add a second timer for the photo script on
  its own cadence.

## Race/candidate coverage tracking

- **No trigger closes a "Pending" (no `races` row yet) seat automatically —
  found live 2026-08-23** when a real gap (Montgomery County Clerk of the
  Circuit Court — in scope, just never got a `races` row; see
  `db/seed.clerk-circuit-court-2026.sql`) was only caught because someone
  happened to notice it during manual testing, not because anything
  surfaced it. Two genuinely different problems here, worth keeping
  separate:
  - **Detection is real, scoped, and buildable now**: a scheduled job (or
    just a query feeding the existing `/admin` "Data freshness" panel,
    same pattern already used for ingestion-source health) that finds
    every `offices` row (`is_elected`) with no matching `races` row for
    the current cycle, in any jurisdiction VoteRight already has residents
    verified in — turns "someone happens to notice" into "staff sees a
    number on a dashboard."
  - **Prioritization signal**: log which specific Pending seats real
    address-verified residents actually view, so ingestion effort goes
    where real people are waiting on it, not wherever staff happens to
    look first.
  - **Sourcing itself is NOT automatable the same way** — unlike
    officeholder rosters (OpenStates/Congress.gov give one consistent
    nationwide API), there's no equivalent for candidate-filing data.
    Every state (often every county) runs its own election system, many
    not built for machine access — closing today's one gap took several
    live fetches by hand against Maryland's own HTML election pages. A
    cron job can tell you *what's* missing; it can't go find and verify
    *who's running* — that's a human judgment call per jurisdiction until
    enough get built up that real reusable patterns emerge (e.g. one
    "Maryland SBE scraper" reused across every MD jurisdiction).
  - Owner's call (2026-08-23): note it, don't build it yet — priority is
    finishing the 1.1.4 mobile testing pass first.

## Mobile

- **Nothing open right now.** The standing "mobile build after web work
  lands" hold was cleared 2026-08-15/16: shipped as **1.1.3** (not 1.1.2 —
  the owner corrected the version mid-build after the 1.1.2 artifacts had
  already uploaded to EAS but before they compiled, so those were cancelled
  and rebuilt clean), build 6 on both platforms, folding in the 8 mobile-
  touching commits from 2026-08-14 that hadn't shipped (Montgomery/PG/DC/
  Fairfax district narrowing, MD Supreme Court circuit narrowing, term-start
  reliability, the "on your ballot in 2026" election-year fix). iOS submitted
  via `eas submit` (App Store Connect / TestFlight); Android's `.aab` was
  handed to the owner directly rather than submitted via EAS (explicit
  instruction: "submit for ios only"). **Both platforms are now in Apple/
  Google review as of 2026-08-16** — Android was uploaded to Play Console
  manually by the owner, outside EAS's `submit` flow, so it did not go
  through the `releaseStatus: "draft"` internal-track path `eas.json`
  configures; it's a real production review submission like iOS.

## Closed this pass (for context, not action)

The following were open earlier in the 2026-08-15 stretch and are now done —
listed so this file doesn't look incomplete next to ARCHITECTURE.md/
DEPLOY.md: admin login lockout + server-side agree/CTQ checks; statewide
photo pipeline retry + flagged-candidates human-review pass (76 applied, 4
wrong-person matches caught and rejected); `term_end` retirement gap in both
roster ingesters; `roster-refresh.sh` + systemd timer/service (monthly,
`Persistent=true`); anomaly detection (velocity + geo-mismatch, migration
084, admin review queue).
