-- Remove the "call the question" early-closure vote entirely (owner
-- decision, 2026-08-24, live-testing a single-participant debate thread).
-- RONR's "previous question" motion solves a synchronous-meeting problem --
-- a room, a clock, competing agenda items -- that doesn't transfer to
-- VoteRight's async debate threads; nobody is waiting in a room for this
-- topic to yield the floor. In practice it let a thread's sole (or a small
-- minority of) active participants unilaterally cut short the fixed
-- closes_at window every OTHER debate gets, undermining the one guarantee
-- that window is supposed to give latecomers: a predictable, equal amount
-- of time to weigh in before it advances to referendum. Every thread now
-- simply runs its full closes_at window, full stop.
--
-- Early closure still exists, but only as a human moderator decision (see
-- closed_by_admin/closed_reason below) triggered by member reports of
-- actual abuse -- not a participant supermajority vote. Same outcome
-- (advance to referendum ahead of closes_at) reached a different way: a
-- person exercising judgment on a specific complaint, not a headcount.
DROP TABLE call_the_question_votes;

ALTER TABLE forum_threads DROP COLUMN close_early_threshold_pct;
ALTER TABLE forum_threads DROP COLUMN call_the_question_min_agreement_votes;

-- closed_early/closed_early_at are kept -- still meaningful ("did this
-- thread close before its natural closes_at date"), just driven by an
-- admin decision now instead of a vote. closed_by_admin stores the admin's
-- username (TEXT, not a FK to admin_accounts -- same reasoning
-- payment_verifications.reconciled_by already established: local dev's
-- ADMIN_TOKEN fallback session has no real admin_accounts row to reference,
-- and a human-readable name serves an audit trail better than an opaque id
-- anyway). closed_reason is required whenever an admin force-closes (never
-- set on a natural closes_at expiry) -- same disclosure instinct
-- close_early_threshold_pct used to serve, now served by an actual written
-- reason instead of a published number.
ALTER TABLE forum_threads ADD COLUMN closed_by_admin TEXT;
ALTER TABLE forum_threads ADD COLUMN closed_reason TEXT;

-- Member abuse reports on a debate thread (2026-08-24) -- the trigger for
-- the human-moderator early-close path above. Thread-level, not per-
-- argument: the failure mode this addresses is a thread devolving into
-- spam/harassment across many posts, not any single flagged argument (that
-- case is already covered by re-running moderate() on an individual
-- argument, unrelated to this table). One open report per (thread, user)
-- -- prevents one person inflating the count by repeat-clicking, same
-- instinct as the UNIQUE constraints on seconds/the now-removed
-- call_the_question_votes elsewhere in this file. reason is required: an
-- unexplained report isn't actionable by a moderator who wasn't there.
CREATE TABLE thread_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   UUID NOT NULL REFERENCES forum_threads(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (thread_id, user_id)
);
-- Backs the admin queue's "which open threads have outstanding reports"
-- query (reportedThreadsQueue() in debates.ts).
CREATE INDEX idx_thread_reports_thread ON thread_reports (thread_id, created_at);
