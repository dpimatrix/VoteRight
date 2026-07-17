# VoteRight — Country Expansion Readiness

Status: v0.1 — first draft, reconstructing the multi-country planning thread · 2026-07-17
Scope: Montgomery County, MD is the **pilot**, not the product's boundary. This document
defines which countries VoteRight can expand into, on what evidence, and with what
posture — so that expansion is a **mechanical, rule-based decision**, never a staff pick.
This deliberately mirrors the commentary-inclusion principle (ARCHITECTURE.md §8.2): where
selection power exists, it must live in published rules applied to published data.

## 1. The inclusion rule (mechanical, re-runnable)

A country is **Tier A (operate fully)** when ALL of the following hold in the most recent
published edition of each source:

| # | Criterion | Source | Threshold |
|---|---|---|---|
| 1 | Regime type | EIU Democracy Index | "Full democracy" (score ≥ 8.0) |
| 2 | Political rights & civil liberties | Freedom House, *Freedom in the World* | Status = **Free** |
| 3 | Rule of law | World Justice Project Rule of Law Index | Overall score ≥ 0.70 (≈ top 30) |
| 4 | Data protection | National law | Comprehensive statute in force with an independent supervisory authority |
| 5 | Election data | Electoral management body | Machine-readable (or scrapable-with-permission) candidate, office, and result data |

**Tier B (operate with country-specific counsel review):** EIU "flawed democracy" AND
Freedom House **Free**. Rule of law functions; politics is contested but courts hold.
The pilot country — the United States — is itself Tier B, which is a feature: every
guardrail is being stress-tested under flawed-democracy conditions from day one.

**Tier C (no operations; research and design only):** EIU "hybrid regime", OR Freedom
House **Partly Free** (whichever is worse governs). A position-holding userbase here is
a targeting list. We may study these systems and design for a better future; we do not
collect residents' political opinions.

**Tier D (do not operate, no exceptions):** EIU "authoritarian", OR Freedom House
**Not Free**. Even an "informational-only" presence invites blocking, data demands, and
danger to anyone who interacts with it.

Rules for applying the rule:

- **Worst source governs.** If FH says Partly Free and EIU says flawed democracy, the
  country is Tier C. Disagreement between indices is itself a warning signal.
- **Re-run annually** on each index release (EIU: February; FH: February–March; WJP:
  October) and after any coup, annulled election, or emergency-powers declaration.
- **Tier movements are append-only events** (same discipline as `commentator_status_events`):
  logged with the triggering source edition, never silently rewritten.
- **Demotion is immediate; promotion waits one full cycle.** A country that re-qualifies
  must hold the qualifying scores across two consecutive editions before operations open.
- **Coverage gaps:** EIU ranks 167 countries; small states (Andorra, San Marino,
  Liechtenstein, Barbados, Bahamas, Pacific micro-states…) may be missing. For those,
  FH status + WJP (if covered) + a counsel memo substitute; absence from an index is
  never itself disqualifying, but it does force the manual memo.

## 2. Tier A — provisional table (verify against 2026 editions before any entry)

Classifications below are from the **EIU Democracy Index 2024** (published Feb 2025),
**Freedom in the World 2025**, and **WJP Rule of Law Index 2024** — the latest editions I
can assert from verified knowledge. Treat every row as "re-verify at market-entry time";
these indices move.

| Country | EIU 2024 | FH 2025 | WJP band | Data-protection law | Notes for VoteRight |
|---|---|---|---|---|---|
| Norway | Full | Free | Top 5 | GDPR (EEA) | Unitary; excellent open election data (Valgdirektoratet) |
| New Zealand | Full | Free | Top 10 | Privacy Act 2020 | Unitary; MMP — coalition promises complicate promise-tracking model |
| Sweden | Full | Free | Top 5 | GDPR | Strong FOI tradition (offentlighetsprincipen) |
| Iceland | Full | Free | Top 15 | GDPR (EEA) | Tiny market; good sandbox candidate |
| Switzerland | Full | Free | Top 15 | revFADP (2023) | **Real referenda exist** — advisory-referendum framing must not be confusable with official votes; strongest mechanism-accuracy risk in Tier A |
| Finland | Full | Free | Top 5 | GDPR | |
| Denmark | Full | Free | Top 5 | GDPR | WJP #1 in recent editions |
| Ireland | Full | Free | Top 10 | GDPR | English-language; PR-STV changes "your ballot" UX substantially |
| Netherlands | Full | Free | Top 10 | GDPR | Pure PR, no districts — jurisdiction stack simplifies |
| Luxembourg | Full | Free | Top 10 | GDPR | |
| Australia | Full | Free | Top 15 | Privacy Act 1988 (2024 amendments) | Compulsory voting + preferential ballots; strong fit for promise tracking |
| Taiwan | Full | Free | Top 25 | PDPA | High disinformation pressure from abroad; §7.7 claim tooling extra-valuable |
| Germany | Full | Free | Top 5 | GDPR + BDSG | Federal — office/jurisdiction model ports well; NetzDG/DSA platform duties |
| Canada | Full | Free | Top 15 | PIPEDA (+ provincial: Québec Law 25) | Closest cultural port from the US pilot; bilingual EN/FR maps to existing EN/ES architecture |
| Japan | Full | Free | Top 15 | APPI | Strict pre-election campaign-speech rules (Public Offices Election Act) — counsel item before any election-period feature |
| Uruguay | Full | Free | Top 30 | Law 18.331 (EU-adequate) | Strongest Latin American fit; Spanish already built |
| United Kingdom | Full | Free | Top 15 | UK GDPR + DPA 2018 | **Claimant-friendly defamation law** — §2.3 discipline is necessary but must be re-reviewed by UK counsel; Electoral Commission open data |
| Austria | Full | Free | Top 10 | GDPR | |
| Costa Rica | Full | Free | Top 30 | Law 8968 | TSE is a strong, respected EMB |
| Mauritius | Full | Free | Top 50 | DPA 2017 | Watch: index scores have wobbled; re-verify carefully |
| Greece | Full | Free | ~Top 50 | GDPR | WJP score is the weak leg — may fail criterion 3; verify |
| Estonia | Full | Free | Top 15 | GDPR | World-leading digital election infrastructure; excellent APIs |
| Czechia | Full | Free | Top 25 | GDPR | |
| Spain | Full | Free | Top 25 | GDPR + LOPDGDD | Regional-language expectations (ca/eu/gl) beyond ES |
| South Korea | Full | Free | Top 20 | PIPA | Verify current EIU edition — scores moved after the Dec 2024 martial-law crisis and 2025 snap election; **may have been reclassified** |

Borderline — verify which side of the line the current edition puts them on:
**France** (has oscillated between full and flawed in recent EIU editions), **Portugal**,
**Belgium**, **Italy**, **Malta** (all high-scoring flawed in recent editions — Tier B if
so), **Israel** (flawed + wartime emergency measures — treat as Tier B-with-flags at
best), **Chile** (has crossed the 8.0 line in both directions).

## 3. Tier B — operate with country-specific counsel review

EIU flawed democracy + FH Free. Full product loop is permitted, but **no market entry
without a country-specific counsel review** covering: defamation regime (civil vs
criminal), pre-election blackout/silence laws, foreign-influence and election-interference
statutes, data-protection law, and EMB data access.

| Region | Countries (provisional) | Recurring cautions |
|---|---|---|
| North America | **United States (pilot)** | Federal patchwork of state privacy laws (MODPA already handled); §230 posture; state-by-state election law |
| Europe | France*, Portugal*, Italy*, Belgium*, Malta*, Cyprus, Slovenia, Latvia, Lithuania, Slovakia, Poland, Croatia, Bulgaria, Romania | *May be Tier A in current edition. Italy/Greece retain **criminal defamation**. France: strict election-silence period + sondage rules. Romania: 2024 presidential annulment — treat as elevated-risk until two clean cycles. Poland: judiciary-independence recovery in progress; watch WJP |
| Latin America | Chile*, Argentina, Brazil, Panama, Dominican Republic, Colombia, Paraguay, Trinidad & Tobago, Jamaica, Guyana, Suriname | Brazil: TSE has ordered platform blocks — compliance posture needed before entry. Several states have criminal defamation ("desacato"-adjacent doctrines) |
| Africa | Botswana, South Africa, Namibia, Ghana, Cabo Verde, Seychelles, Lesotho, Malawi, Zambia, Senegal | South Africa: POPIA in force, strong courts — best-documented entry point. Senegal: qualified after 2024 transfer of power; apply the promotion-waits-one-cycle rule |
| Asia-Pacific | Mongolia, Timor-Leste, Bhutan, Sri Lanka, Indonesia, Malaysia, Philippines, Papua New Guinea, Solomon Islands, Samoa, Vanuatu | Philippines: journalist-safety environment makes the commentary rail (§8.2) a physical-risk surface, not just a legal one. Indonesia: criminal defamation actively used (UU ITE); Sri Lanka: verify post-2024 trajectory |
| Small states (index coverage gaps) | Barbados, Bahamas, Belize, St. Lucia, St. Vincent, Grenada, Dominica, St. Kitts, Antigua, Andorra, San Marino, Liechtenstein, Micronesia, Marshall Is., Palau, Kiribati, Tuvalu, Nauru | Not EIU-ranked; FH Free. Use the counsel-memo substitute from §1 |

## 4. Tier C / Tier D — the diligence posture (the "not yet enshrined" world)

Named here only to make the boundary concrete; the list is whatever the current indices
say, not this snapshot. Recent-edition examples — Tier C (hybrid / Partly Free):
**India** (FH Partly Free since 2021 — the world's largest democracy is explicitly *not*
an early market, whatever the commercial temptation), Mexico (EIU downgrade after the
2024 judicial-election overhaul), Hungary (first EU member rated Partly Free), Serbia,
Georgia, Turkey (verify — may be D), Bangladesh, Peru*, Ecuador, Thailand, Singapore
(Partly Free despite functioning courts — the rule holds: worst source governs), Ukraine
(a democracy defending itself under martial law with elections constitutionally suspended
— revisit the moment post-war elections are scheduled; likely the most important future
market on this list).

Posture in Tier C/D:

1. **No collection of residents' political opinions or identities. Ever.** The dominant
   risk is not legal exposure to VoteRight; it is that our database becomes a dissident
   list. No "lite" version, no anonymous-mode exception (anonymity we can't guarantee
   against a state adversary is a promise we can't keep — §10.2's honesty-at-the-moment-
   of-action rule applies to us too).
2. **Design research is permitted and encouraged** — understanding how mandates, promise
   tracking, and civic evidence could work in these systems is exactly the "proceed very
   diligently" work, done from outside.
3. **Diaspora communities in Tier A/B countries are in-scope** for their country of
   residence's elections only. We do not build features that organize users around the
   politics of a Tier C/D homeland.
4. **Exit rule:** if an operating country is demoted below Tier B, the platform freezes
   new political-opinion collection there immediately, and the pre-designed data-
   minimization runbook executes (to be written before the first non-US launch: what we
   delete, what we aggregate, what users are told, in what order — counsel item).

## 5. Cross-cutting risks (recap of the analysis thread)

Reconstructed from the lost session; each becomes a gating item in COUNSEL-REVIEW.md
before the first non-US market:

- **Foreign-interference inversion.** Abroad, *VoteRight is the foreign actor*. Many
  democracies (Australia's FITS, Canada's C-70, EU frameworks) regulate foreign
  participation in elections. Mitigation: local entity or local civic-org partnership
  per country; no country entered "remotely" from a US company alone.
- **Mechanism accuracy generalizes badly.** The §2 discipline (never misstate a legal
  lever) was hand-verified for Maryland. Every country needs its own verified
  legal-levers map before the mandate loop switches on there — this is the single most
  expensive per-country cost and cannot be shortcut.
- **Defamation is not one thing.** US actual-malice is the *most* permissive regime we
  will ever operate under. UK (claimant-friendly civil), Italy/Japan/Indonesia (criminal
  exposure) each need §2.3 re-reviewed locally. The right-of-reply machinery ports
  everywhere and helps everywhere.
- **Election-period speech law.** Blackout/silence periods (France, Italy, and many
  others) may prohibit publishing scoring or referendum results in the final days —
  the `election_cycles` promotion-blackout column becomes per-country configurable law,
  not policy.
- **Data residency.** GDPR adequacy flows, Québec Law 25, and others constrain where the
  database lives. Neon region choice becomes a per-country decision.
- **Electoral-system diversity.** The schema's office/race/candidate model assumes
  candidate-centric elections. Party-list PR (Netherlands, Spain), MMP (Germany, NZ),
  and STV (Ireland, Australia Senate) need modeling work — promises made by *parties*
  vs *candidates* is a real architecture question, not a localization detail.
- **The pilot is the proof.** Nothing internationalizes until the Montgomery County loop
  has run through at least one real election cycle. This document exists so the schema
  and legal architecture don't paint us into a US-only corner — not to accelerate entry.

## 6. Schema implications (design-ahead, build-later)

Not built now; recorded so Phase 4+ choices don't foreclose them:

- `countries` table with `operating_tier` (A/B/C/D), `tier_events` append-only log
  (source edition, prior tier, new tier, trigger) — same pattern as
  `commentator_status_events`.
- `jurisdictions` already stack (county → municipality); a country level on top is
  additive, not a rework.
- Per-country legal-config: blackout windows, defamation-review level, data-residency
  region — configuration rows, not code forks.
- All user-facing legal-mechanism copy (§2) keyed by jurisdiction, never global.

## 7. Standing cadence

| When | What |
|---|---|
| Feb–Mar (EIU + FH releases) | Re-run §1 rule across all tiers; log movements |
| Oct (WJP release) | Re-run criterion 3 |
| Any coup / annulment / emergency declaration | Immediate ad-hoc re-run for that country |
| Before any market entry | Country counsel review (§3 list) + legal-levers map (§5) + two-edition stability check |
