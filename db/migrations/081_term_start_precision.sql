-- Term-start reliability, made explicit instead of inferred (2026-08-14).
--
-- Real bug found live earlier today: a senator's term_start marked when
-- their CONTINUOUS tenure in the chamber began, not their current term --
-- reelected without a gap, and it never resets, so computing "next
-- election year" from it can be confidently wrong (a senator since 2017,
-- reelected 2022, showed "next election: 2022" -- already in the past).
-- Fixed at the time with a narrow proxy: congress_sourced (does this
-- politician have a bioguide_id), which only covers Congress.
--
-- Auditing the OTHER hand-verified migrations (063 governors, 064-077
-- every other statewide office) for the same risk turned up a real,
-- broader problem: migration 063 explicitly discloses the identical
-- "continuous tenure, not necessarily most recent re-election" caveat,
-- and migration 076 inherits it too (same ingestion discipline as
-- Congress, its own header says so). The REST (064, 065, 066, 067, 068,
-- 070, 071, 072, 073, 074) have inconsistent, sometimes terse sourcing
-- language that doesn't clearly say either way -- auditing each one
-- person-by-person for who has actually been reelected isn't practical
-- to do reliably in one pass, and guessing which ones are safe is
-- exactly the failure mode that caused the original bug.
--
-- Rather than keep extending a narrow congress_sourced-shaped proxy migration
-- by migration, this makes trust EXPLICIT and QUERYABLE, defaulting to
-- NOT trusted for date math -- the safe direction, since the fallback
-- (the existing "on ballot" assumption) is honest-but-uninformative, never
-- confidently wrong the way a bad computed year is. Only migration 061
-- (President/VP) is retroactively marked precise: a genuinely
-- unambiguous case, real first-term inauguration date, no reelection
-- possible to confuse it with. Every other existing row -- including
-- Congress and Governors, whose specific unreliability is already known,
-- and everything else, whose reliability is simply unverified -- stays
-- at the safe default. Revisit per-office as each one gets properly
-- re-verified, same hand-verify discipline as every other real-officeholder
-- fact in this project.
ALTER TABLE office_terms ADD COLUMN term_start_precise BOOLEAN NOT NULL DEFAULT false;

UPDATE office_terms SET term_start_precise = true
 WHERE politician_id IN (
   '31000000-0000-4000-8000-000000000101', -- President
   '31000000-0000-4000-8000-000000000102'  -- Vice President
 );
