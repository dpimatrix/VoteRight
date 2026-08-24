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
- ~~Photo renewal on turnover~~ **DONE (2026-08-24)** — `statewide-official-
  photos.mjs` added as a third step in `roster-refresh.sh` itself (not a
  second timer — it's idempotent, correctly ordered after the roster
  scripts so a new officeholder actually exists in the DB first). Verified
  live against the dev DB, not just read: a real run downloaded **93 new
  photos** for statewide officials who had none, using the strict,
  position-held-verified matcher (zero identity risk — the same trusted
  path this project already used for the original 76). 0 download
  failures, exit code 0.
- ~~80 unambiguous flagged candidates ready for review~~ **32 applied
  (2026-08-24)**, the rest triaged. First re-run of `statewide-official-
  photos-flagged.mjs` (before the strict script above had been scheduled)
  showed 155/21 -- running the strict script's real 93-photo catch-up in
  between resolved many of those through its own stricter, position-held-
  verified path, dropping the honest remaining count to 80/13 (13
  matching the original ambiguous list above exactly -- a useful
  consistency check). The 80 were verified via Wikidata's own bulk API
  (batched `wbgetentities`, cross-checking each item's description
  against the expected office+state, then a second pass resolving each
  weak match's own "position held" claims for same-state prior-office
  corroboration) rather than either blindly bulk-applying all 80 or
  browsing 80 pages by hand:
  - **31 confirmed safe by description match or corroborating prior
    office** (15 description-strong + 16 position-held-corroborated) +
    **Susana Mendoza (IL Comptroller)**, caught by hand after the
    automated office-string match missed "Comptroller" vs. the roster's
    "Controller" wording -- **32 total, applied** via
    `apply-flagged-photo.mjs` against the dev DB, 32/32 succeeded, 0
    skips.
  - **3 confirmed wrong-person matches caught and deliberately NOT
    applied**: "Andy Wilson" flagged for OH AG resolves on Wikidata to a
    British cyclist; "Mark Hunt" flagged for WV Auditor resolves to a
    New Zealand kickboxer; "Steven C. Johnson" flagged for KS Treasurer
    resolves to a Maryland state delegate. All three are same-name,
    wrong-person collisions the loose flagged-matcher can't distinguish
    without this kind of cross-check -- exactly the failure mode the
    strict script (`statewide-official-photos.mjs`) is designed to avoid
    by requiring a real position-held statement.
  - **1 likely-wrong match, held back out of caution**: "Randy Smith"
    flagged for WV Lt. Gov describes as a "video game designer" on
    Wikidata -- a strong red flag, but his position-held claims were
    empty rather than actively corroborating a different person, so this
    is slightly less certain than the 3 above. Needs the same manual
    check as the 13 ambiguous names before either applying or discarding.
  - **49 still unclear** -- no description or position-held corroboration
    either way -- need individual research, same as the 13 ambiguous
    names above.
- **Wikimedia Commons attribution/licensing gap, found but not yet
  addressed**: `congress.mjs` and `statewide-official-photos*.mjs`
  download raw pixel files from Commons via `Special:FilePath` URLs with
  no license/author/attribution metadata captured, unlike the
  hand-curated `app/public/politicians/ATTRIBUTION.md` covering the
  original 11 Montgomery County Council photos. Many Commons files
  require CC-BY-SA-style attribution when redistributed. Affects 600+
  images already downloaded (531 Congress + 93 strict-matched + 32
  flagged-and-applied statewide this round) -- a decision on whether/how
  to backfill attribution is still open.

## Race/candidate coverage tracking

- ~~No trigger closes a "Pending" (no `races` row yet) seat
  automatically~~ **DONE for detection + prioritization (2026-08-24,
  migration 091)** — found live 2026-08-23 when a real gap (Montgomery
  County Clerk of the Circuit Court — in scope, just never got a `races`
  row; see `db/seed.clerk-circuit-court-2026.sql`) was only caught because
  someone happened to notice it during manual testing. New `/admin/race-
  coverage` screen (own RBAC key): `lib/coverage.ts`'s `pendingCoverageGaps()`
  finds every elected office with no `races` row for the current cycle, in
  any jurisdiction with at least one address_verified-or-better resident
  (a recursive walk up `jurisdictions.parent_ocd_id`, same pattern
  `ballotForJurisdiction` already uses) — ranked by `pending_seat_views`,
  a new log of which specific Pending seats real residents' own ballots
  actually showed them (one row per office/user/day, fired from
  `app/page.tsx`'s Ballot render, mirroring `SeatRow`'s own tracked/
  judicial/off-cycle branching so the signal matches what residents
  actually see). Verified live: Clerk of the Circuit Court correctly does
  NOT appear (already fixed); a real Ballot-page visit as a verified
  Montgomery County resident logged 10 genuine gaps (state/federal offices
  with no 2026 race seeded) and the admin query correctly ranked the
  viewed ones first among 146 total gaps nationwide.
  - **Sourcing itself is still NOT automatable the same way** — unlike
    officeholder rosters (OpenStates/Congress.gov give one consistent
    nationwide API), there's no equivalent for candidate-filing data.
    Every state (often every county) runs its own election system, many
    not built for machine access. This screen tells you *what's* missing
    and *where the demand is*; it can't go find and verify *who's
    running* — that stays a human judgment call per jurisdiction until
    enough get built up that real reusable patterns emerge (e.g. one
    "Maryland SBE scraper" reused across every MD jurisdiction).

## Admin-editable priority topics/axes

- ~~`topics`/`topic_axes` only insertable via `db/seed.prod.sql`, zero admin
  route~~ **DONE (2026-08-24, migration 092)** — new `/admin/priority-axes`
  screen, its own RBAC key, all four guardrails built as actual enforcement,
  not just UI convention:
  - **Published-axis wording is locked at the database layer** — a
    `BEFORE UPDATE` trigger rejects any change to `question`/`negative_pole`/
    `positive_pole`/`topic_id`/`key` once `status = 'published'`. Verified
    live: a direct `UPDATE` against a published axis was rejected with the
    trigger's own error, not just refused by the admin UI. A rewording is a
    new `createDraftAxis()` call + `retireAxis(oldId, newId)`.
  - **Structured two-pole fields** — `lib/priorityAxes.ts`'s
    `createDraftAxis()` takes `negativePole`/`positivePole` as separate
    required parameters, matching the schema's own existing symmetric
    shape; the admin form renders them as two distinct labeled inputs, not
    one free-text block.
  - **Draft → in_review → published → retired**, enforced both in the API
    (`approveAndPublish()` rejects `reviewedBy === createdBy` before
    touching the database) and in the database itself (`CHECK
    (reviewed_by_admin IS NULL OR reviewed_by_admin <> created_by_admin)`).
    Verified live end-to-end: drafted a test axis as the dev admin,
    submitted for review, confirmed the UI correctly hid the publish
    button ("you drafted this one, you can't publish it"), then bypassed
    the UI with a direct `fetch()` POST to `approve_and_publish` — the
    server rejected it too; the axis stayed `in_review`, unpublished.
  - **Own RBAC screen** (`priority_axes`) in the existing per-screen system
    (migration 086) — no code touches the SCREEN_KEYS list without an
    explicit grant.
  - `topicsWithAxes()` (the Priorities-setting screen), `axesForCoding()`
    (staff position-coding queue), and `savePriorities()` all filtered to
    `status = 'published'` — a resident or staff coder can never be offered
    a draft/in_review axis before it's actually cleared review.

## Mobile

- **1.1.4 is in active hands-on testing, not yet submitted to either app
  store** (the note below described 1.1.3, which shipped 2026-08-16 —
  superseded). The owner has been testing build-by-build on a real Android
  device since; a long list of real, live-found bugs have been fixed
  same-session as found, so none of them needed a standing backlog entry —
  consistent with this file's own policy of only logging *deferred* items.
  Highlights from this pass: mobile never actually signed debate
  arguments/proposals/seconds/campaign-support (Hermes has no
  `crypto.getRandomValues`, silently falling back to posting unsigned every
  time — fixed via `expo-crypto`, needed a fresh dev-client build since
  it's a native module); the Matches screen gained web-parity features it
  never had (per-axis tappable dots, coverage bar, method citation, a
  compare-two-candidates view) plus a genuinely mobile-only fix
  (photo/party weren't rendering at all); the Accountability screen's
  campaign-creation pathway list was shipping **131 unscoped nationwide
  pathway rows** to every verified user regardless of residence — a
  Montgomery County resident's reform campaign could silently bind to a
  different county's legal mechanism depending on row order (now scoped
  to the resident's own jurisdiction stack); the politician picker went
  from one flat unlabeled list to grouped by office to grouped by
  jurisdiction (owner asked for each step directly); campaigns gained a
  real citation field (previously asked "cite the record" with nowhere to
  put one); duplicate near-identical campaigns now get suggested instead
  of silently piling up (`pg_trgm` similarity). No standing hold, nothing
  deferred out of this pass — next real milestone is finishing the
  testing pass and cutting an actual 1.1.4 release build.
- ~~1.1.3 shipped~~ **DONE (2026-08-16)** — build 6 on both platforms,
  folding in the 8 mobile-touching commits from 2026-08-14 that hadn't
  shipped (Montgomery/PG/DC/Fairfax district narrowing, MD Supreme Court
  circuit narrowing, term-start reliability, the "on your ballot in 2026"
  election-year fix). iOS submitted via `eas submit` (App Store Connect /
  TestFlight); Android's `.aab` was handed to the owner directly rather
  than submitted via EAS (explicit instruction: "submit for ios only").
  Both platforms went through Apple/Google review and are live.

## Closed this pass (for context, not action)

The following were open earlier in the 2026-08-15 stretch and are now done —
listed so this file doesn't look incomplete next to ARCHITECTURE.md/
DEPLOY.md: admin login lockout + server-side agree/CTQ checks; statewide
photo pipeline retry + flagged-candidates human-review pass (76 applied, 4
wrong-person matches caught and rejected); `term_end` retirement gap in both
roster ingesters; `roster-refresh.sh` + systemd timer/service (monthly,
`Persistent=true`); anomaly detection (velocity + geo-mismatch, migration
084, admin review queue).
