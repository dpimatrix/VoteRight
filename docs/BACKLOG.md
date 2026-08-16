# VoteRight — Backlog

Durable list of known, open items that are **not** being silently forgotten —
distinct from ARCHITECTURE.md §13 (open questions specifically needing
counsel) and DATA-OPS.md (how the ingestion pipeline runs today). Add a dated
entry when something real gets deferred instead of only mentioning it in a
chat; remove/close out an item here the same session it actually ships,
rather than letting this drift out of sync with reality.

## Security / trust model

- **`govt_id_verified` identity tier** — blocked on the owner picking a
  vendor (Persona / Stripe Identity / ID.me), plus the jurisdiction-size
  threshold and cost-bearing decision. ARCHITECTURE.md §13 item 9 explicitly
  flags this as needing counsel, not just an engineering call. The
  anomaly-detection system shipped 2026-08-15 (velocity + geo-mismatch
  flagging, ARCHITECTURE.md §9) narrows the practical Sybil gap but does
  **not** close it — it's a flag-for-human-review layer, not identity proof.
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
