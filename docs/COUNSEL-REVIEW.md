# VoteRight — Counsel Review Checklist

Status: v1.0 — prepared for initial engagement · 2026-07-16
Sources: ARCHITECTURE.md §13 (items 1–14), §2 (legal guardrails), SCORING.md
Owner contact: repository owner (dpimatrix/VoteRight)

## What VoteRight is (one paragraph)

A civic platform piloting in Montgomery County, MD: voters state policy priorities in
their own words; candidates are scored against them using sourced positions and recorded
votes; campaign promises are tracked to kept/broken with an evidence trail; and an
advisory direct-democracy layer (issue proposals → debate → unofficial referenda) produces
"voter mandates" that are put to every candidate for the relevant office, on the record,
before the election. Nothing the platform runs is an official election process, and the
design treats that distinction — plus defamation discipline around named people — as its
central constraint. This checklist packages every open legal question; the referenced
mitigations are already designed and, where noted, demonstrable in a working prototype.

## Materials

| Item | Where |
|---|---|
| Architecture & legal guardrails | `docs/ARCHITECTURE.md` (read §2 first) — rendered: architecture artifact page |
| Database schema (constraints are load-bearing) | `docs/SCHEMA.sql` — validated on PostgreSQL 16 |
| Scoring methodology | `docs/SCORING.md` |
| Working prototype (voter app + admin console) | prototype artifact — **Admin console tab demonstrates the dispute/right-of-reply workflow and the human-confirmation gate on scoring inputs** |

All candidates, commentators, and sources in the prototype are fictional by design; the
county structures, statutes, and bill numbers are real.

## Facts we assert that counsel should independently re-verify

The document's credibility rests on these; we have verified them against primary sources
and want a second set of eyes (ARCHITECTURE.md §2 has the full statements and citations):

- No petition-based recall exists for Maryland state officials, Montgomery County
  officeholders, or federal officials. Councilmember removal is a 7-of-11 vote under
  County Charter §118 (disability finding only, post-hearing, appealable).
- Voter-initiated charter amendment: Md. Const. Art. XI-A §5 — 20% of registered voters
  **or 10,000 signatures, whichever is fewer**.
- Maryland's purchased voter file is restricted to "electoral process" uses; misuse is a
  criminal misdemeanor (we never ingest it).
- MD SB 141 (AI election content) is enacted, effective 2026-06-01.
- MODPA is in force (effective 2025-10-01; reaches processing from 2026-04-01).

---

## A. Election & campaign-finance law

**A1. Electioneering classification** *(§13 item 1 — initial read before Phase 1; final before Phase 2)*
Does publishing per-candidate integrity scores and alignment matches, especially near an
election, constitute "electioneering communication" or express advocacy under FEC and
Maryland law, under the funding/promotion scenarios we plan? Designed posture: the
platform publishes sourced information and never endorses; scoring methodology is
published and versioned (SCORING.md).
**We need:** a classification opinion per funding scenario, and any timing/promotion
restrictions we should build in as configuration.

**A2. Entity structure** *(item 2 — before Phase 1; blocks fundraising)*
501(c)(3) vs. 501(c)(4) vs. for-profit vs. none — and what each permits the platform to
say about named candidates.
**We need:** a recommendation matched to the intended funding model.

**A3. Charter-petition organizing spend** *(item 6 — before Phase 4)*
The app lets users organize toward a real charter-amendment signature drive (e.g., adding
recall). Does spending organizational funds to promote such a drive trigger Maryland
campaign-finance or ballot-question-committee registration? In-app support counts are
explicitly *not* legal signatures (disclosed in-product).
**We need:** registration triggers and a compliance checklist before the feature carries
real drives.

**A4. Mandate-commitment tabulation** *(item 13 — before Phase 4)*
Publishing every candidate's commit/decline/no-response stance on advisory voter
mandates, close to an election: does the tabulation itself change the A1 analysis?
**We need:** whether stance grids need timing rules, and sign-off on the `no_response`
display (see B3).

**A5. Commentator recruiting** *(item 14 — before Phase 2)*
Actively recruiting named local commentators for roster balance: any in-kind-support
exposure if a commentator later proves to have undisclosed candidate ties? Designed
posture: rule-based inclusion (never staff picks), mandatory disclosure field, evidence-
gated disqualification with right of reply, and an election-window promotion blackout
(`commentary_promotion_blackout_days` — **confirm a real value per jurisdiction; the
schema default is 0/off**).
**We need:** outreach-process sign-off and the blackout window value.

**A6. AI-generated debate content** *(item 8 — before Phase 5)*
One-shot, disclosed, citation-gated AI arguments in debate threads, versus **enacted**
SB 141 (eff. 2026-06-01: knowing/reckless AI fabrications intended to deceive voters;
satire/news carve-outs require AI disclosure). Our read: disclosed, non-impersonating,
evidence-gated content sits inside the statute — but that is counsel's call, and
prohibition-style successors (the 2025 SB 361 approach) may return.
**We need:** a compliance opinion against the statute as interpreted at launch, and a
monitoring trigger for successor bills.

## B. Defamation & publication risk

**B1. Integrity-flag workflow** *(item 4 — before Phase 2; the highest-exposure feature)*
Calling a named politician's promise "broken" or a statement contradicted is a factual
claim. Designed mitigations, all demonstrable: every status change requires a dated,
archived citation; publication is blocked by a database constraint while a flag is open;
mandatory right-of-reply precedes resolution; history is append-only (corrections add
events, never erase). **The admin console demo walks the full pipeline.**
**We need:** review of the workflow as built — evidence standard, reply window length,
resolution criteria, and retraction/correction procedure.

**B2. Scoring as an assertion about a candidate** *(item 11 — before Phase 1)*
An alignment band is a published characterization of a named candidate. Designed
mitigations: bands not numbers; human-confirmed codings only (model suggestions are
structurally unable to score anyone); silence excluded and displayed, never scored;
vote-vs-statement conflicts routed to the B1 workflow rather than asserted by the scorer;
standing bias audits with published results (SCORING.md §S7).
**We need:** methodology sign-off, including whether any disclaimer language should
accompany bands.

**B3. "No response" as a displayed fact** *(item 13 — before Phase 4)*
Displaying that a candidate didn't answer a mandate question (with our outreach attempts
documented) — confirm it carries no defamation-adjacent implication of a stance never
taken. The platform never infers stances; `no_response` is the only unsourced state a
constraint permits.
**We need:** copy-level sign-off on the no-response treatment.

**B4. Commentator disqualification** *(item 14 — before Phase 2)*
Publicly disqualifying a named journalist (e.g., "undisclosed campaign ties") is itself a
claim about a real person. Designed: disqualification requires evidence (database
constraint), carries right of reply, append-only history — the same discipline applied to
politicians.
**We need:** confirmation the due-process design is sufficient, and any notice
requirements before status changes take effect.

## C. Privacy & data

**C1. MODPA compliance** *(item 12 — baseline before Phase 1; full review before Phase 3)*
Maryland's privacy statute is in force and its 35,000-consumer threshold likely covers a
county-scale app. Designed: data minimization (no raw gov-ID storage; hashed email
treated as personal data, not anonymized); designed account deletion (pseudonymize public
civic contributions, hard-delete private signals); classified participation privacy —
public acts vs. private signals with retention rules (ARCHITECTURE.md §10.2).
**We need:** coverage confirmation; whether political-opinion data (priorities, agreement
votes, ballots) is "sensitive data" under MODPA; whether pseudonymize-and-keep satisfies
the deletion right for public debate contributions; retention-rule sign-off.

**C2. Small-N re-identification** *(item 5 — before any aggregate publishing)*
`anonymous_aggregate` outputs (e.g., "62% of District 3 respondents…") can de-anonymize
at small N.
**We need:** a minimum-cell-size / suppression rule to implement as a hard constraint.

**C3. Ballot secrecy sufficiency** *(item 10 — before Phase 4)*
Referendum ballots are split from identity (token indirection; identity link severed by
post-certification redaction) — structural secrecy, honestly documented as short of
cryptographic e-voting guarantees (§10.1).
**We need:** whether structural secrecy suffices for an advisory poll of this visibility,
or whether a stronger protocol is warranted before mandates carry real political weight.

## D. Accuracy of legal mechanisms shown to voters

**D1. Per-office mechanism verification** *(item 3 — rolling, before each expansion)*
`accountability_pathways` tells each voter what removal/reform mechanisms actually exist
for their seat, sourced to charter/statute text and populated by hand. Some Maryland
municipalities may genuinely have recall.
**We need:** a verification procedure counsel is comfortable with (who checks, how often,
what triggers re-check), and spot-verification of the pilot county's entries.

## E. Third-party platform terms

**E1. YouTube integration** *(item 7 — before Phase 3)*
Embed-only rendering, cached metadata via the official API, no re-hosting, no scraped
caption tracks; moderation delists our reference, never touches the video.
**We need:** confirmation against current YouTube ToS/API terms.

## F. Product decisions needing legal input

**F1. Identity verification vs. equity** *(item 9 — decision before Phase 4)*
Sybil resistance wants government-ID verification for high-stakes referenda; ID
requirements skew participation against exactly the populations the product exists to
serve (34% foreign-born county). This is a product decision, but counsel input is needed
on: liability exposure of each verification tier, vendor data-handling terms, and any
discrimination-adjacent risk in tier-gating civic features.

---

## Phase-gate summary

| Before… | Items |
|---|---|
| Phase 1 (profiles + scoring) | A1 (initial), A2, B2, C1 (baseline) |
| Phase 2 (promises + integrity flags + commentary) | A1 (final), A5, B1, B4 |
| Phase 3 (debate forum) | C1 (full), E1 |
| Phase 4 (referenda + mandates + campaigns) | A3, A4, B3, C2, C3, D1, F1 |
| Phase 5 (AI debate agents) | A6 |

## Standing items after launch

- Quarterly: bias-audit results review (SCORING.md §S7); D1 re-verification cadence.
- Per legislative session: SB 141 successors (A6); MODPA amendments (C1).
- Per expansion jurisdiction: D1, A5 blackout value, pathway verification.
