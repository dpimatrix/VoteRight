# VoteRight

A civic platform piloting in Montgomery County, MD: voters state their priorities in
their own words; candidates are matched against them using sourced positions and
recorded votes; promises are tracked to kept/broken with an evidence trail; and an
advisory direct-democracy layer produces voter mandates that are put to every candidate,
on the record, before the election.

Design stance in one line: **epistemic status is always visible** — sourced fact (teal),
advisory/community voice (gold), and attributed analysis are three registers that never
blur, every claim about a named person carries a citation, and silence is displayed,
never scored.

## Repository layout

| Path | What |
|---|---|
| `docs/ARCHITECTURE.md` | Domain model, schema rationale, workflows, legal guardrails (read §2 first) |
| `docs/SCHEMA.sql` | Canonical DDL — validated on PostgreSQL 16; constraints are load-bearing |
| `docs/SCORING.md` | Alignment-scoring methodology v0.1 (published & versioned per §2.3) |
| `docs/COUNSEL-REVIEW.md` | The 14 open legal items, packaged per legal domain with phase gates |
| `docs/ARCHITECTURE.artifact.html` | Source of the published architecture page |
| `app/` | **Phase 1 build** — Next.js monolith (see `app/README.md`) |
| `db/` | Dev database: `docker compose up -d` applies schema + seed |
| `prototype/` | Interactive design prototype (all phases' screens) + its test suites |

## Status

- Phase 1 (profiles, priorities, matching, outside-money & endorsement disclosure): **built** — `app/`
- Phase 2 (promise records, integrity dispute workflow with right of reply, admin console): **built** — `app/` (`/admin`)
- Phase 3 (issue debates: proposals → seconding → text debate with claim prompts, CTQ, verification gate, moderation): **built** — `app/` (`/debates`)
- Phases 4–5 (referenda/mandates, AI debate agents) + commentary, clustering, media formats: designed & prototyped, not yet built
- Counsel review: packaged, not yet engaged (`docs/COUNSEL-REVIEW.md`)

All sample candidates and sources are fictional by design (ARCHITECTURE.md §2.3);
county structures, statutes, and legal thresholds are real and re-verifiable.
