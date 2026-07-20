# VoteRight — Position Coding Standards

Status: v0.1 · 2026-07-20 · governs both human coders and model-suggested drafts
Scope: how a recorded vote (or other sourced position) becomes a `position_codings`
row — the interpretive step SCORING.md §S2 puts in human hands. This document exists
so that judgment calls made once are applied consistently forever, by whoever or
whatever drafts the next one.

## The one rule everything below follows

**Code only what the record actually shows. When in doubt, code narrower, not wider.**
A coding is a claim about a real person; SCORING.md's whole design (bands not scores,
citations required, human confirmation) exists to keep that claim defensible. A coder
who is unsure whether a bill speaks to an axis should skip it, not guess.

## Precedents (binding until superseded here)

### P1 — A "nay" on enacting something is not a commitment to its opposite extreme
A vote against creating a policy is evidence *against* the policy, not evidence *for*
its most extreme reversal. Coding a nay-to-enact at the pole reserved for "actively
repeal/reverse" overclaims — some nay votes objected to implementation details, cost,
or timing, not the policy's existence.

**Rule:** a vote *against enacting* a policy that matches the axis's positive pole
codes at **magnitude 1 in the opposing direction**, never magnitude 2, unless the
bill's own text is a repeal/reversal of an *existing* policy (in which case the vote
being coded is itself the extreme act, and magnitude 2 is correct).
*Set by: Bill 15-23 (rent stabilization), 2026-07-19 — nay coded −1, not −2.*

### P2 — An adjacent-topic bill codes at reduced magnitude, never full
When a bill's literal subject differs from the axis's literal question but shares the
same underlying disposition (e.g., a *recordation* tax vote when the axis asks about
*property* tax), the vote is real evidence of the disposition but not a direct answer
to the question asked. Full magnitude is reserved for bills that are actually about
what the axis asks.

**Rule:** adjacent-topic evidence codes at **magnitude 1**, and the position statement
must name the actual subject of the bill and say explicitly that it differs from the
axis's literal subject — never let the reader infer a direct hit that isn't there.
*Set by: Bill 17-23 (recordation tax) against the property-tax axis, 2026-07-20.*

### P3 — Silence and absence are never coded
A politician who did not vote (absent, abstained, not yet in office) gets no row.
`voting_records.vote` already distinguishes `abstain`/`absent` from `yea`/`nay`; the
coding tool must never infer a position from either. This mirrors the mandate-
commitment and integrity-flag "no_response is the only stance asserted without a
citation" rule elsewhere in the platform — consistent discipline, one rule.

### P4 — One official record, one axis, once per person
A single vote may legitimately speak to more than one axis (a transportation-funding
bill could touch both transit and tax), but each (politician, bill, axis) triple is
coded at most once. If a bill genuinely speaks to two axes, code it twice as two
separate `politician_positions` rows, each with its own statement scoped to that
axis — never one row stretched to justify two different claims.

### P5 — The statement must be verifiable from the citation alone
Every position statement should read as something a skeptical reader could confirm by
opening the cited source and nothing else: "Voted for/against [the bill's actual
subject], [bill number, date]." Never characterize motive, never editorialize, never
say more than the roll call and bill title support.

## Model-suggested drafts (coding_method = 'model_suggested')

A model may draft a coding from a bill's title alone (no full bill text is available
from the ingested source). Because a title carries far less signal than the text a
human coder would read, model drafts must be **more conservative than a human
applying P1–P5**, not equally conservative:

- If the title's connection to an axis is not unambiguous, the model returns no
  suggestion for that bill — silence in the queue, not a low-confidence guess.
- A model suggestion is never magnitude 2 unless the title itself names the exact
  policy the axis's pole describes (e.g., "Rent Stabilization" for the housing axis).
  Anything softer than that starts at magnitude 1 and lets the human coder raise it
  after reading the actual bill.
- Every suggestion is inserted with `confirmed_by_human = FALSE` — the generated
  `usable_for_scoring` column enforces that no suggestion ever scores anyone before a
  human in `/admin/coding` confirms, adjusts, or rejects it. This is a schema
  constraint, not a process convention.
- The prompt given to the model must include this document (or its rules) verbatim,
  not a paraphrase — the standards are the contract, and paraphrasing invites drift.

## Changing this document

A new precedent is added here, with the bill/decision that set it, before the coding
tool (human or model) relies on it going forward. This file is the coding methodology's
audit trail — SCORING.md's bias-audit program should sample against it.
