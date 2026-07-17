# VoteRight — Phase 1 app

Single Next.js monolith (ARCHITECTURE.md §6.2): SSR pages + REST route handlers in one
process, one PostgreSQL database. Phase 1 scope: your-ballot roster, voter priorities,
alignment matches (SCORING.md v0.1), candidate profiles with sourced positions,
independent-expenditure disclosure, and endorsement tracking. Bilingual EN/ES (`?lang=es`).

## Quickstart

```sh
# 1. database (applies docs/SCHEMA.sql + db/seed.sql on first boot)
cd db && docker compose up -d

# 2. app
cd app && npm install && npm run dev
# → http://localhost:3000    (DATABASE_URL defaults to postgres://postgres:vr@localhost:5433/voteright)
```

Reset the database: `docker compose down -v && docker compose up -d` from `db/`.

## Tests

```sh
npm test        # scoring engine unit tests (SCORING.md worked example + gates)
npm run build   # typecheck + production build
```

## Layout

| Path | What |
|---|---|
| `src/lib/scoring/engine.ts` | Pure SCORING.md v0.1 engine — bands, coverage gate, dealbreaker, conflict rule, `ALGORITHM_VERSION` with config hash |
| `src/lib/queries.ts` | All SQL. The S2 gate is here: only `usable_for_scoring` codings reach the engine |
| `src/lib/matches.ts` | Race scoring orchestration + insufficient-last ordering |
| `src/lib/anon.ts` | Cookie-scoped anonymous voter (`users.verification_tier = 'unverified'`) |
| `src/app/api/*` | REST: ballot, topics, priorities, races, matches, candidates/[id] |
| `src/app/{,priorities,matches,candidates}` | SSR pages using the design-system tokens |

## Honest boundaries

- Seed data: real county structure; **fictional candidates by design** (§2.3).
- No auth/verification tiers yet — the anonymous cookie voter is the Phase 1 posture
  (unverified users may draft priorities privately; §9). Identity service comes with
  Phase 4 gating.
- Phase 2 built: promise records with append-only histories, the integrity dispute
  workflow (evidence → right of reply → resolve; publish gated by a DB CHECK), and the
  admin console (/admin — dev token gate via ADMIN_TOKEN, default dev-admin) with the
  dispute queue and the position-coding queue. Commentary, debates, referenda: Phases 2b–5.
