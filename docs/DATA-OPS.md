# VoteRight — Real Data Operations Plan

Status: v0.1 — plan, not yet built · 2026-07-18
Scope: replace the fictional pilot seed with real Montgomery County data, without ever
mixing the two in production, and without weakening a single §2.3 guardrail on the way.
This document decides sources, order, and rules; each phase below ships as its own PR.

## 0. The one rule that governs everything else

**The production database never mixes real and fictional people.** The moment the first
real politician row lands in Neon, every fictional politician, position, promise, flag,
debate, and mandate must already be gone from that database. Fictional data remains the
*development* seed (`db/seed.sql`) forever — it is good test scaffolding — but production
transitions in one cutover, not gradually. Until cutover, the deployed site keeps its
"fictional by design" posture; after cutover, every claim on the site is about a real
person and must carry its citation.

## 1. Prerequisite: migration tooling (D0)

The manual-Neon-apply step we've been doing at merge time is fine for one table and fatal
for data ops. Before any real data:

- `db/migrations/NNN_description.sql` — plain SQL files, numbered, append-only.
- A ~50-line runner (`db/migrate.mjs`, node-postgres only, no new dependencies) that
  records applied migrations in a `schema_migrations` table and applies pending ones in
  order, transactionally where possible.
- `docs/SCHEMA.sql` stays as the *canonical full schema* for fresh databases; each change
  now lands in BOTH a migration file and SCHEMA.sql (CI check later: fresh-apply equals
  migrated result).
- Runbook: migrations run against Neon **before** the code that needs them deploys
  (the PR #4 lesson, systematized).

## 2. Source inventory (all official or first-party; §2.6: never the purchased voter file)

| Data | Source | Access | Notes |
|---|---|---|---|
| Officeholders & terms | Montgomery County Council / County Executive official rosters | Scrape + manual confirm | Small, slow-changing; every `office_terms` row cites the official roster page (archived) |
| 2026 candidates & filings | Maryland State Board of Elections certified candidate lists | Published lists (CSV/HTML) | Primary results are certified — the general-election field for County Executive and Council is now a knowable fact; re-verify list state at build time |
| Council votes & bills | Montgomery County Legistar (Granicus) | Public web API | Feeds `voting_records` (UNIQUE(politician, bill) makes ingestion idempotent); every row keeps its Legistar source URL |
| Campaign finance / independent expenditures | MDCRIS (Maryland Campaign Reporting Information System) | Public search/exports | Feeds `independent_expenditures`; the filing itself is the citation (already NOT NULL in schema) |
| Registered voter counts | SBE monthly registration reports | Published PDFs/CSV | Refreshes `jurisdictions.registered_voter_count` — the mandate turnout denominator; record `as_of` |
| Candidate positions | Campaign sites, VoteRight questionnaire, public debate/forum transcripts | Human pipeline | NEVER auto-published: `position_codings.usable_for_scoring` already gates on human confirmation at the schema level; the admin coding queue is the built tool |
| Endorsements | Endorsing organizations' own announcements | Manual + citation | Same discipline as positions |
| Promises | Campaign materials (archived at capture) | Human pipeline | Mostly post-election work; origin citation required by workflow |
| Federal officials (later) | Congress.gov API | API key (free) | ProPublica Congress API is retired (verified earlier) — Congress.gov only |
| State legislators (later) | Maryland General Assembly site / OpenStates | API/scrape | Out of pilot scope until county loop is proven |

Standing rules: every ingested fact carries `source_url`/citation; §2.3-sensitive surfaces
(integrity flags, promise status changes) additionally require an **archived copy**
(Wayback capture at ingestion — the `archive_url` column is already there; D2 adds the
actual capture call).

## 3. Build order

| Phase | What | Risk | Ships when |
|---|---|---|---|
| **D0** | Migration tooling (§1) + prod-seed split: `db/seed.sql` (fictional, dev) vs `db/seed.prod.sql` (structural only: jurisdictions, offices, topics, axes, cycles, races, pathways, commentator rules — no people) | None | Immediately |
| **D1** | **Cutover + real roster.** Wipe fictional people from Neon; ingest real officeholders (`politicians`, `office_terms`) and the certified 2026 candidate field (`candidacies`) from SBE lists, each row cited | Low — pure public record | After D0 |
| **D2** | **Voting records.** Legistar ingester (idempotent, incremental) + Wayback capture utility; positions of type `voting_record_inferred` enter the coding queue (human confirms before scoring) | Low-medium | After D1 |
| **D3** | **Money + endorsements.** MDCRIS independent expenditures; endorsements as announced | Low — filings are the citation | Parallel with D2 |
| **D4** | **Positions + scoring goes live.** VoteRight questionnaire sent to every certified candidate (same instrument to all — §2.3 fairness); campaign-site/transcript capture; staff coding via the built queue. Matches display only when a candidate clears SCORING.md's 50% coverage gate; the bias-audit program (SCORING.md) starts its clock here | Medium | After counsel reviews methodology (item 11) |
| **D5** | **Promises & integrity flags on real people.** Only after counsel signs off on the dispute/right-of-reply workflow (COUNSEL-REVIEW category B) and the reply-window ops are staffed (that's you, at pilot scale) | Highest | Counsel-gated |

Address validation (the /verify production seam) rides with D1: server-side Census Bureau
geocoder call at submit, replacing the dev city-matcher — same contract, real boundaries.

## 4. What cutover does to the built features

- **Debates/referenda/mandates/campaigns:** structural seed keeps topics and axes; real
  proposals start from zero. The seeded fictional debate content does not migrate.
- **Verification tiers:** unchanged; real launch keeps self-attested + format/geocode
  (§2.6 — still never matched against any voter file).
- **Commentary (§8.2):** rule-based inclusion can begin counting real local commentators
  (the Phase 2b ingestion remains unbuilt; D3-adjacent if wanted).
- **The prototype artifact and dev environment stay fictional** — they are design
  surfaces, labeled as such.

## 5. Owner decisions needed before D1 (the cutover)

1. **Office scope at launch:** County Executive + County Council (both modeled, both have
   2026 races) is the recommendation. School Board and judicial can stay "Not yet
   tracked" — the ballot already renders that honestly. Add them only with a data owner.
2. **Questionnaire timing (D4):** sending it to real campaigns is VoteRight's first
   outward-facing act toward the people it scores — counsel should see the instrument
   first (added as item 15 to the counsel checklist).
3. **Public-launch posture:** Vercel protection stays ON through D1–D3 shakedown; the
   §13/DEPLOY.md gate table governs when the URL is promoted.
4. **Operator capacity:** D5's right-of-reply windows create real response-time
   obligations on a real person's reputation — one operator must be able to meet them, or
   D5 waits.

## 6. Standing cadences once live

| When | What |
|---|---|
| Weekly | Legistar vote ingestion; MDCRIS sweep |
| Monthly | SBE registration-count refresh; roster diff check |
| Per SCORING.md | Bias-audit sampling + acceptance gates |
| Per COUNSEL-REVIEW | Post-launch legal cadences already tabled there |
