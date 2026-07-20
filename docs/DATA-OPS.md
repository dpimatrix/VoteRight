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
| **D3** | **Money + endorsements.** MDCRIS independent expenditures; endorsements as announced. *Source decision (2026-07-19): MDCRIS's public viewer is a JS shell with session-bound export XHR — at county IE volume (a handful of filings per cycle), D3 ships as admin-curated entry with a mandatory filing citation per row; bulk automation is a documented seam (SBE bulk-data request, or the MDCRIS XHR endpoints when volume warrants)* | Low — filings are the citation | Parallel with D2 ✔ shipped |
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

## 6. Ingestion scheduling (decided)

**Mechanism: GitHub Actions scheduled workflows**, not in-app cron. Ingest scripts run in
the repo's CI with `DATABASE_URL` as a repo secret, writing directly to Neon — visible
logs, automatic failure email, a manual re-run button, no duration limits, zero new
vendors. (Vercel serverless is the wrong shape for ingestion: function duration limits,
Hobby-plan cron restrictions, and ingestion should never share the request path with
voters.) Cadence follows each source's real change rate, not the calendar:

| Source | Cadence | Why |
|---|---|---|
| Legistar votes | Weekly (after session day) | The Council votes on session days, not continuously |
| MDCRIS filings | Weekly → **daily inside the 30 days before an election** | Filing deadlines are lumpy; 48-hour notices cluster pre-election |
| SBE candidate list | Weekly diff | Withdrawals are rare events |
| SBE registration counts · roster diff | Monthly | Slow-moving |

Three rules that outrank frequency:

1. **Idempotent by construction** — re-running any ingest is always safe (the schema's
   UNIQUE constraints make duplicates impossible), so missed or doubled runs are non-events.
2. **Ingestion is never publication** — scheduled jobs may write *facts with citations*
   (votes, filings); anything interpretive lands in the human coding queue. No cron ever
   auto-publishes a §2.3-sensitive claim about a real person.
3. **Show staleness honestly** — an `ingestion_runs` ledger (source, run time, rows,
   status) drives an admin freshness panel and voter-facing "data current through {date}"
   stamps. Built in D2 alongside the first ingester.

## 7. The scaling shape differs by data type (owner Q&A, 2026-07-20)

Prompted by hand-entering a real MDCRIS filing: the committee's legal name ("Affordable
Maryland") didn't match press shorthand ("Affordable Maryland PAC"), the filing had to be
found by a human, and two of the six people it named weren't in VoteRight's roster yet.
The reaction — "we can't possibly do this for thousands of counties" — is correct about
the *labor*, but conflates three data types that scale along genuinely different axes.
Getting this right matters for every future jurisdiction-expansion decision, so it's
recorded here rather than re-derived each time:

| Data type | Scaling unit | Why | Automates? |
|---|---|---|---|
| Votes / bills | Per **legislative body** — thousands (every county, city, and town council, plus state legislatures and Congress) | Each body publishes (or doesn't) its own records | **Yes**, where a clean source exists — proven by D2. OpenStates normalizes all 50 state legislatures behind one API (the next highest-leverage integration); Congress.gov covers federal; Legistar-pattern municipalities are individually adapter-able. Genuinely uncovered bodies stay "Not yet tracked," honestly, same as an unscored ballot seat today. |
| Independent expenditures / campaign finance | Per **state** — fewer than 50 systems, because in the US this is regulated at the state level, not the county level. MDCRIS is Maryland's statewide system; it covers every race in the state, not just Montgomery County's | Even where a state has a searchable database, it is rarely a clean API (D3 already found MDCRIS to be a session-bound JS viewer, not machine-readable at any volume) | **No, not really, at any scale.** A ~50-state problem is far smaller than the "thousands" framing suggests, but it doesn't shrink further — matching a committee's press name to its legal filer name and confirming named people are real filers is an act of judgment, not a parsing problem. This stays admin-curated in every state, forever. |
| Endorsements | Per **organization** — unbounded, and permanently manual | There is no government filing system for "who endorsed whom" anywhere, ever — an endorsement is just an organization's own announcement | **Never.** This is not a scaling problem to solve; it is a standing editorial-operations problem. |

**The operating conclusion:** don't try to make campaign-finance or endorsement tracking
mirror vote-ingestion's automation model — they are not the same shape of problem, and
forcing them into a "scrape more sources" plan produces a brittle scraper for a data type
that resists it (already tried and rejected for MDCRIS in D3 §3). The way real
organizations do this at national scale (OpenSecrets, FollowTheMoney, Ballotpedia) is a
**distributed network of local researchers/stringers**, not a bigger integration surface.
The labor scales with *how many competitive races are covered*, not with jurisdiction
count — a genuinely bounded, staffing problem, not an engineering one. When VoteRight
expands beyond Montgomery County, budget people-hours for money/endorsements per new
*state* covered; budget engineering-hours for votes/bills per new *data source* covered.
These are different roadmaps and should never be planned as though they were the same one.

## 8. Standing cadences once live

| When | What |
|---|---|
| Per §6 schedule | Automated ingestion (GitHub Actions) |
| Monthly | Review ingestion_runs for silent failures; roster diff check |
| Per SCORING.md | Bias-audit sampling + acceptance gates |
| Per COUNSEL-REVIEW | Post-launch legal cadences already tabled there |
