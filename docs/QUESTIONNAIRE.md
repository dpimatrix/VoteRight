# VoteRight — Candidate Questionnaire (the instrument)

Status: v0.1 DRAFT — for counsel review (COUNSEL-REVIEW.md item F2) before any
candidate contact · 2026-07-19
Scope: 2026 Montgomery County Executive and County Council At-Large general-election
candidates. Sent to **every certified candidate in a race, identically, on the same
day** — fairness is structural, not aspirational.

## 1. Why this document is the whole feature

Everything VoteRight publishes about a candidate today is inferred from public records.
The questionnaire is the one place candidates speak *to the platform* in their own
words — which makes it the platform's first outward-facing act toward the people it
scores, and the reason counsel sees this text before any campaign does. The questions
below are **verbatim the published scoring axes** (docs/SCORING.md S2; the same
`topic_axes` text voters see), so a candidate answers exactly the question their score
is computed on. No hidden rubric.

## 2. Cover communication (verbatim draft)

> Subject: VoteRight candidate questionnaire — [RACE], 2026 general election
>
> Dear [CANDIDATE NAME],
>
> VoteRight is a nonpartisan civic-information platform piloting in Montgomery County.
> Voters on the platform state their own policy priorities; candidates are matched to
> those priorities using sourced public positions — recorded votes, campaign materials,
> and this questionnaire.
>
> We are sending the identical six questions, on the same day, to every certified
> candidate in your race. Your answers will be published verbatim on your VoteRight
> profile, attributed to this questionnaire, and used as sourced positions in voter
> matching under our published methodology.
>
> Three commitments, in both directions:
> 1. **Your words are never edited.** Answers appear verbatim, with a link back to
>    this questionnaire as the source.
> 2. **Silence is shown as silence.** If you choose not to respond, your profile
>    shows "no public position found" on any topic where none exists — never a
>    guessed stance, and never a penalty score. Non-response is displayed as exactly
>    that.
> 3. **You can correct us.** Every claim on the platform carries its source, and a
>    standing right-of-reply process exists for anything you believe is wrong.
>
> There is no cost to participate, no cost to decline, and nothing of value is
> provided or requested — this questionnaire is published civic information, like a
> newspaper's. The deadline for inclusion in the first publication window is
> [DATE, ≥14 days out]; late answers are added on arrival.
>
> [SUBMISSION MECHANISM — see §5]
>
> VoteRight · [contact] · methodology: [link to SCORING.md rendering] · privacy: [link to /privacy]

## 3. The six questions (verbatim = the published axes)

Response scale for each question, identical everywhere on the platform:
**−2** = [negative pole, verbatim] · **−1** = lean that way · **0** = mixed/undecided ·
**+1** = lean the other way · **+2** = [positive pole, verbatim] · **Decline to answer**
Each question also has an optional free-text line (≤500 characters, published verbatim).

| # | Topic | Question (verbatim from `topic_axes`) | −2 pole | +2 pole |
|---|---|---|---|---|
| 1 | Housing affordability | Should annual rent increases stay capped near the current limit? | Repeal the cap | Keep or tighten the cap |
| 2 | Transit & roads | Should Ride On bus service expand countywide? | Hold current service | Expand countywide |
| 3 | Public schools | Should the county fully fund the MCPS operating budget request? | Fund below the request | Fully fund the request |
| 4 | Climate & environment | Should the county meet its zero-emissions targets on schedule? | Delay or relax targets | Keep or accelerate targets |
| 5 | Public safety | Should the county hire more police officers for neighborhood patrols? | Hold or redirect staffing | Hire more officers |
| 6 | Taxes & budget | Should the county hold the line on property-tax increases? | Open to increases | No increases |

## 4. Photo permission (the D4 portrait policy's missing half)

> Optional: provide a campaign photo (headshot, ≥400×400) and check this box to grant
> VoteRight a non-exclusive license to display it on your profile. Without it, your
> profile shows a neutral monogram — officeholders' profiles use official government
> portraits. We never copy images from campaign websites.

## 5. Delivery, verification, and handling

- **Delivery:** email to the campaign's SBE-registered contact address, with the
  candidate's published campaign-site contact as fallback; identical send time.
- **Authenticity:** each candidate receives a single-use submission link (token in the
  URL, same pattern as referendum ballots); answers submitted through it are recorded
  with timestamp. A campaign may instead reply on letterhead/from the registered
  address; staff then enter answers verbatim with that correspondence archived as the
  citation.
- **What gets stored:** answers land as `politician_positions` (source_type
  `questionnaire`, citation = the submission record) with `position_codings` from the
  numeric answer, `coding_method = 'staff'` after a human confirms the transcription.
  The free-text line is the position statement, verbatim.
- **Amendments:** a campaign may revise an answer any time pre-election; revisions are
  append-only (old answer remains in the record as superseded, consistent with every
  other ledger on the platform).
- **No response:** after [DATE], profiles show the standing silence treatment. One
  reminder is sent at the halfway mark; the outreach log (sent date, reminder date) is
  retained so "we asked" is provable — the same discipline as mandate-commitment
  outreach.

## 6. Questions for counsel (this is item F2)

1. Does anything in §2 risk being construed as coordination with, or a contribution
   to, a campaign (Md. election law / campaign-finance definitions)?
2. Is the "published verbatim" commitment safe against a candidate submitting
   defamatory text about a third party in the free-text line? (Proposed mitigation:
   the same §2.3 review-before-publish that applies to all UGC, disclosed in the
   cover: "answers that make factual claims about other named people go through the
   same sourcing review as everything else on the platform.")
3. Any notice/disclaimer the cover must carry under MD electioneering rules, given
   the platform is not a PAC and spends nothing on candidates' behalf?
4. Photo license language in §4 — adequate, and any minors/likeness edge cases?
5. Does simultaneous-identical-send satisfy any equal-treatment expectations that
   attach to §501-style neutrality (should VoteRight later seek that status)?

## 7. Change control

The instrument text is versioned here; the questions themselves change only when
`topic_axes` changes (which is a SCORING.md governance event with its own trail).
Counsel-approved version gets tagged v1.0 and is the only version ever sent.
