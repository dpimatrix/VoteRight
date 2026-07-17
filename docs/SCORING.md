# VoteRight — Alignment-Scoring Methodology

Status: v0.1 — design decided, pending counsel/bias review (ARCHITECTURE.md §13, item 11)
Governs: computation of `alignment_scores` and every user-facing presentation of candidate–voter fit
Companion to: ARCHITECTURE.md §5.1 (summary), SCHEMA.sql (`topic_axes`, `position_codings`)

This is the document Section 2.3 promised: the scoring methodology is **published and
versioned**, so a score is reproducible and appealable, not a black box. Everything below
is versioned as `algorithm_version`; changing any constant or rule requires a new version.

---

## S1. Principles

1. **Bands, not numbers.** The UI never shows "87.3/100" — a decimal score manufactures
   precision this method cannot back. Fit is expressed as one of five labeled bands plus
   an explicit insufficient-data state.
2. **Every band is explainable from stored data alone.** A voter tapping "why?" sees their
   own statement, the candidate's coded position, the evidence rows with citations, and
   the weights used. If the stored data can't answer "why this band," the method is wrong.
3. **Silence is visible, never scored.** A missing position is excluded from the aggregate
   *and displayed*. Scoring silence as neutral invents a centrist who doesn't exist;
   penalizing it punishes challengers and low-coverage candidates — a structural
   incumbency bias either way.
4. **Deterministic and reproducible.** Same inputs + same `algorithm_version` → same
   output, always. No sampling, no model calls at scoring time.
5. **Judgment converted to stated rule.** Where a human interpretation is unavoidable
   (reading a statement onto a policy axis), it is recorded as an auditable row with a
   confirmer, never embedded inside an opaque matcher.

## S2. The matching substrate: structured axes, not embeddings

**Decision: hybrid — structured stance axes are the scoring substrate; embeddings may
only *suggest* codings to a human, never decide them.**

- Each topic carries one or more **axes** (`topic_axes`): a neutral policy question with
  named −2…+2 poles. Example — Housing → `rent_stabilization`: "Should annual rent
  increases stay capped near the current limit?" (−2 = repeal the cap … +2 = keep or
  tighten the cap).
- A **voter priority** selects a topic, states the wish in the voter's own words, and
  resolves to an axis + direction (±1). The free text is the voter's record and the UI's
  echo; the axis/direction is what scores. The input flow offers axis choices; an
  embedding model may *rank the suggestions*, but the voter's tap is the decision.
- A **candidate position** (`politician_positions`, always citation-backed) is coded onto
  an axis with a value in −2…+2 (`position_codings`). Coding is done by staff, or
  model-suggested and human-confirmed — the generated `usable_for_scoring` column is TRUE
  only for staff-coded or human-confirmed rows, and **scoring reads only those rows**.
- **Recorded votes enter through the same door**: a roll call relevant to an axis is
  ingested as a `politician_positions` row with `source_type = 'voting_record_inferred'`
  citing the roll call, then coded like any other position — so behavior and speech are
  comparable on one scale, with behavior weighted higher (S3).

Why not embeddings-only matching: it cannot satisfy §2.3. An embedding similarity is not
reproducible across model versions, not explainable to a voter, not appealable by a
candidate, and its biases are unmeasurable except in aggregate. The cost of the hybrid is
a human coding queue; that cost is the feature.

## S3. Candidate axis value: evidence hierarchy

A candidate's value on an axis is the weighted mean of their usable codings, using
disclosed evidence weights × a recency multiplier, rounded to the nearest integer in
−2…+2.

| Evidence (`source_type`) | Weight (v0.1) |
|---|---|
| `voting_record_inferred` (roll call) | 1.0 |
| sponsored/co-sponsored legislation | 0.9 |
| `questionnaire` | 0.7 |
| `campaign_site` | 0.6 |
| `debate_transcript` / `interview` | 0.5 |

Recency multiplier: `0.5 ^ (age_years / 6)` — evidence loses half its weight every six
years (≈ one county term + one cycle). Both tables of constants are part of
`algorithm_version`.

**Conflict rule:** if a candidate's highest-weight evidence (votes) and their statements
differ by ≥ 3 units on one axis, the vote-derived value governs the score, *both* are
shown to the voter, and the conflict is queued as a candidate integrity-flag suggestion
into the §7.2 pipeline (where the dispute/right-of-reply workflow governs whether it
becomes a public flag — scoring itself never asserts "hypocrisy").

## S4. Per-topic agreement and bands

For each voter priority: `agreement = clamp(candidate_axis_value × voter_direction, −2, +2)`.

| Agreement | Band |
|---|---|
| +2 | Aligns strongly |
| +1 | Leans aligned |
| 0 | Mixed |
| −1 | Leans opposed |
| −2 | Opposed |
| no usable coding | No public position (excluded from aggregate, always displayed) |

## S5. Aggregation, coverage, and the dealbreaker rule

With voter weights `w_t` (1–5) over topics `t`:

- **Aggregate** `A = Σ w_t·a_t / (2·Σ w_t)` over *answered* topics only → A ∈ [−1, +1].
- **Coverage** `C = Σ w_t (answered) / Σ w_t (all)`.

| Condition (v0.1) | Overall band |
|---|---|
| C < 0.50 | Not enough information (no fit band shown; sorted last, dashed card) |
| A ≥ 0.55 | Strong match |
| A ≥ 0.20 | Good match |
| A > −0.20 | Mixed |
| otherwise | Differs from your priorities |

**Weighted mean, deliberately not worst-topic-dominates** — a single disagreement
silently sinking an otherwise strong match is an editorial stance smuggled into an
aggregation function. Instead, the **dealbreaker rule** surfaces it without deciding it:
any weight-5 topic with agreement ≤ −1 puts a visible "Conflicts with one of your top
priorities" marker on the candidate card. The marker never changes `A`; the voter judges.
*(Specified here; lands in prototype v6 — not in v5.)*

The prototype's demo scorer implements S4–S5 with these exact constants; the production
difference is only S2–S3 (coded axes + evidence weighting instead of a single hand-set
stance per candidate per topic).

## S6. Worked example

Voter: Housing, "Keep annual rent increases capped near the current 3% limit," direction
+1 on `rent_stabilization`, weight 5.

Candidate Trent's usable codings on that axis: Bill 15-23 roll call YES
(`voting_record_inferred`, value +2, weight 1.0 × recency 0.71) and a campaign-site
statement (value +2, weight 0.6 × 1.0). Weighted mean = +2 → agreement = +2 →
**Aligns strongly**, with both evidence rows and their weights shown. Candidate Quinn has
no usable coding on the axis → **No public position**, topic excluded, row displayed.

## S7. Bias audit program

Run before every `algorithm_version` release and quarterly in production; results
published alongside the methodology page. v0.1 acceptance gates:

1. **Incumbency audit.** Compare band and coverage distributions for incumbents vs.
   challengers. Expected: incumbents have higher coverage (they have voting records) —
   that is disclosed, not hidden; the *gate* is that among candidates with comparable
   coverage, band distributions show no systematic incumbent advantage.
2. **Partisan symmetry.** A synthetic suite of mirrored voter profiles (each left-leaning
   profile paired with its right-leaning mirror) scored against the full candidate set:
   require |A(profile) + A(mirror)| ≤ 0.05 on average. The method must be a mirror, not
   a lens.
3. **Coverage bias.** Which candidates systematically land in "Not enough information"?
   If the answer correlates with language of coverage, outlet type, or party, that is an
   ingestion-pipeline defect to fix, not a candidate defect to display.
4. **Suggestion-aid robustness.** The embedding model that *suggests* axes/codings is
   audited by paraphrase perturbation: ≥ 95% of paraphrased voter statements must yield
   the same top axis suggestion. (It cannot bias scores directly — humans confirm — but
   it can bias the queue.)
5. **Coder agreement.** Double-code a sample of positions each quarter; report
   inter-coder agreement on axis values. Persistent disagreement on an axis means the
   axis is badly phrased — fix `topic_axes.question`, don't average the ambiguity.

## S8. Versioning and change control

- `algorithm_version` format: `score-v<major>.<minor>+cfg-<hash8>` where the hash covers
  every constant in S3–S5.
- Old `alignment_scores` rows are retained per version (the unique constraint already
  includes `algorithm_version`); the UI labels which version produced what it shows.
- Changes ship with: updated public methodology page, changelog entry, and a fresh S7
  audit run. Threshold or weight changes are *minor*; substrate changes (S2) are *major*.
- Counsel review checkpoint before Phase 1 ships (ARCHITECTURE.md §13, item 11) and
  whenever a major version changes what the platform asserts about a named candidate.
