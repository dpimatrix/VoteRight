# VoteRight — Counsel Review Checklist

Status: v1.1 — prepared for initial engagement · updated 2026-07-21
Sources: ARCHITECTURE.md §13 (items 1–14), §2 (legal guardrails), SCORING.md
Owner contact: repository owner (dpimatrix/VoteRight)

**Update since v1.0:** the platform now runs on real Montgomery County data, not the
fictional pilot seed — real officeholders, real 2026 candidates for every elected county
seat, 1,925 real recorded votes, real independent-expenditure filings, all live and
publicly viewable (behind access protection, not yet promoted). Nothing scored or
asserted about a real person is published yet — that is exactly what section "Minimum
viable engagement" below is scoped to unblock.

## Minimum viable engagement — if counsel time is limited, start here

Three questions, in priority order, that unlock the most already-built product with the
least review time. Each is answerable without reading the whole codebase — the design is
built and demonstrable; what's needed is a yes/no and any required adjustments.

1. **B2 — may we display alignment scores for real candidates?** The scoring substrate is
   already built and populated (every current councilmember has 3 of 6 topic axes coded
   from their actual recorded votes, each citing the official roll call). Nothing is
   displayed publicly yet. This is the single highest-value unlock: it is the platform's
   core feature, already engineered, sitting inactive behind this one sign-off.
2. **F2 — may we send the candidate questionnaire?** A drafted, ready-to-send instrument
   (`docs/QUESTIONNAIRE.md`) that would let every 2026 candidate answer the platform's six
   published questions in their own words — filling the three axes (transit, schools,
   safety) that recorded votes alone can't reach, and doing so fairly (identical
   questions, identical send time, to every candidate in a race).
3. **C1 baseline — is the current data-collection posture MODPA-compliant today?** Real
   residence/priority data collection is technically live (though the site isn't publicly
   promoted). A baseline confirmation that the built design (data minimization, the
   `/privacy` rights mechanism, the pseudonymize-on-deletion model) satisfies MODPA as
   currently operated would close the most time-sensitive open item, since it's the one
   statute already in force against data the platform can already collect.

Everything else in this checklist can wait for a fuller engagement; these three are the
ask if the first conversation is short.

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
| Country expansion tiers (pilot → multi-country) | `docs/EXPANSION-READINESS.md` — rule-based market inclusion; per-country gates in its §3/§5 |
| MODPA privacy notice + rights mechanism (DRAFT for category C review) | `/privacy` and `/privacy/request` in the app; queue with statutory clock in the admin console; deletion executes ARCHITECTURE.md §10 pseudonymization |
| Candidate questionnaire instrument (DRAFT for item F2 — §6 of the doc lists the specific questions for counsel) | `docs/QUESTIONNAIRE.md` |
| Working prototype (voter app + admin console) | prototype artifact — **Admin console tab demonstrates the dispute/right-of-reply workflow and the human-confirmation gate on scoring inputs** |
| **Live production app (real data, access-protected)** | https://voteright-dpimatrix.vercel.app — sign in with a Vercel account to view; **the codebase behind it is public** at github.com/dpimatrix/VoteRight if counsel prefers to read source directly |
| **One-page summary for an initial consultation** (send ahead of a first call) | `docs/COUNSEL-ONE-PAGER.md` |

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

**F2. Candidate questionnaire instrument** *(item 15 — before DATA-OPS.md phase D4)*
Before VoteRight sends its questionnaire to real campaigns (the platform's first direct
outreach to the people it scores), counsel should review the instrument itself: identical
questions to every candidate in a race (fairness), neutral axis phrasing (the topic_axes
text doubles as the published methodology), how non-response is displayed (silence shown
as silence — same rule as mandate commitments), and whether anything in the cover
communication could be construed as coordination or as soliciting a thing of value.

---

## Phase-gate summary

Phases 1–4 and data-ops steps D1–D3 are **built and live** (real people, real votes, real
money, all on real Montgomery County data) — the phase names below now describe what
counsel's sign-off *activates*, not what remains to be coded.

| Before… | Items | Build status |
|---|---|---|
| Phase 1 (profiles + scoring) | A1 (initial), A2, B2, C1 (baseline) | Built; scores withheld pending B2 |
| Phase 2 (promises + integrity flags + commentary) | A1 (final), A5, B1, B4 | Built; no real integrity flags published yet |
| Phase 3 (debate forum) | C1 (full), E1 | Built (fictional debates only so far) |
| Phase 4 (referenda + mandates + campaigns) | A3, A4, B3, C2, C3, D1, F1 | Built (fictional referenda only so far) |
| Phase 5 (AI debate agents) | A6 | Not built |
| Real-data D4 (questionnaire + live scoring) | B2 (re-confirm on real data), F2 | Scoring substrate built for real candidates; questionnaire drafted, unsent |
| Real-data D5 (integrity flags on real people) | B1, B4 (operational readiness, not just design) | Not started |

## Finding counsel

**Recommended first call: Bar Association of Montgomery County, MD — Lawyer Referral
Service.** (301) 279-9100, Spanish available, weekdays 9am–1pm. Connects to a locally
barred attorney for a ~30-minute consultation at a nominal fee, matched by practice area
(ask for election/campaign-finance law, or government/administrative law if that's not
available). A Montgomery County-barred attorney is the right fit here specifically — the
platform's legal-mechanism claims (D1) are already scoped to this county's charter and
Maryland election law, not a generic jurisdiction.

Other options if that doesn't yield a good match: the Maryland State Bar Association's
directory of county lawyer-referral services (msba.org) for other counties; the Pro Bono
Resource Center of Maryland (probonomd.org) or University of Maryland Carey School of
Law's Clinical Law Program, if a no/low-cost review is preferable to a paid consultation
and timeline flexibility allows for it.

### Ready-to-send outreach note

> Subject: Legal consultation request — civic-tech election platform (Montgomery County)
>
> I'm building VoteRight, a nonpartisan civic-information platform piloting in Montgomery
> County — voters state policy priorities, candidates are matched using sourced positions
> and voting records, and an advisory (non-official) referendum layer produces "voter
> mandates" candidates answer on the record. I'm looking for an initial consultation, not
> a full engagement, on three specific yes/no questions:
>
> 1. May we publicly display alignment scores for real 2026 candidates, given our
>    designed mitigations (bands not raw numbers, human-confirmed sourcing only, standing
>    bias audits)?
> 2. May we send an identical policy questionnaire to every candidate in a race, given our
>    draft cover letter and fairness design?
> 3. Does our current data-collection design satisfy Maryland's Online Data Privacy Act
>    as currently operated?
>
> I have a written package ready — a one-page project summary, the specific legal
> questions with our designed mitigations for each, and a live (access-protected) working
> app — so the intake read should be fast. Happy to send in advance of a call.
>
> [YOUR NAME] · [YOUR CONTACT] · project repo: github.com/dpimatrix/VoteRight

## Standing items after launch

- Quarterly: bias-audit results review (SCORING.md §S7); D1 re-verification cadence.
- Per legislative session: SB 141 successors (A6); MODPA amendments (C1).
- Per expansion jurisdiction: D1, A5 blackout value, pathway verification.
