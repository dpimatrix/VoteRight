-- Re-add "call the question" with real floors (owner decision, 2026-08-24,
-- reversing part of migration 093). Migration 093's finding stands -- a
-- supermajority vote with NO floor on group size let one person single-
-- handedly close their own thread -- but the underlying capability (a
-- genuinely, broadly settled debate advancing before the full 14-day
-- window) is legitimate, not just a manipulation vector. Two floors, both
-- required before the vote becomes AVAILABLE at all (not just before it can
-- succeed), close the actual gap instead of removing the feature outright:
--   - call_the_question_min_active: a real supermajority needs a real
--     group, not 1-of-1. Same "cheap to brigade, smaller N" reasoning
--     ARCHITECTURE.md §9 already applies to this action.
--   - call_the_question_min_open_hours: even a fast, legitimately large
--     supermajority can't close a thread before someone who checks the app
--     every few days has had a real chance to see it -- the actual harm
--     from the original design (cutting the window short for latecomers),
--     addressed directly rather than via participant count alone.
-- Both are real columns, not hardcoded constants, same disclosed/auditable
-- instinct close_early_threshold_pct always had.
ALTER TABLE forum_threads ADD COLUMN close_early_threshold_pct NUMERIC(4,1) NOT NULL DEFAULT 66.7;   -- RONR default: 2/3
ALTER TABLE forum_threads ADD COLUMN call_the_question_min_agreement_votes INTEGER NOT NULL DEFAULT 3; -- unchanged from before: agreement-vote-only "active" eligibility floor
ALTER TABLE forum_threads ADD COLUMN call_the_question_min_active INTEGER NOT NULL DEFAULT 3;          -- NEW floor: total active participants required before the vote is even offered
ALTER TABLE forum_threads ADD COLUMN call_the_question_min_open_hours INTEGER NOT NULL DEFAULT 72;     -- NEW floor: hours since opened_at required before the vote is even offered
-- Set once floorsMet is first detected true for a thread (by the
-- close-and-notify-threads.mjs background job) -- lets that job notify
-- participants exactly once per thread on the transition, not every cycle.
ALTER TABLE forum_threads ADD COLUMN ctq_eligible_notified_at TIMESTAMPTZ;

CREATE TABLE call_the_question_votes (
    thread_id       UUID NOT NULL REFERENCES forum_threads(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX idx_call_the_question_votes_thread ON call_the_question_votes(thread_id);

-- Notifications (2026-08-24) -- in-app + mobile push + email, triggered by
-- debate-thread lifecycle events (closed, newly call-the-question-eligible)
-- but a generic enough shape to cover future event types without another
-- migration. type + joined ids, NOT a pre-rendered message: this app is
-- bilingual throughout (i18n.ts on both platforms), and a message rendered
-- once at creation time in whichever language happened to be active
-- server-side would defeat that -- the client renders the actual text from
-- `type` + the joined thread/proposal title, in the reader's own current
-- language preference, same as every other piece of UI copy in this app.
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL CHECK (type IN ('thread_closed', 'ctq_eligible')),
    proposal_id UUID REFERENCES issue_proposals(id),
    thread_id   UUID REFERENCES forum_threads(id),
    detail      TEXT,                      -- e.g. an admin's closed_reason, when relevant
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Backs both the unread-badge count and the inbox list -- same index serves
-- "unread only" (badge) via the WHERE and "everything, newest first" (full
-- list) via the leading columns alone.
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;

-- Mobile push tokens (2026-08-24) -- Expo's push service: free, already
-- part of the Expo toolchain this app is built on, no new vendor decision
-- (unlike email below). One row per (user, device): the same anon identity
-- can have the app installed on more than one device (the same "same
-- cookie, multiple devices" property migration 088's key recovery already
-- relies on), and each physical device needs its own token to receive a
-- push at all. UNIQUE on token, not (user_id, token): re-registering the
-- same physical device under a DIFFERENT current user_id (e.g. after an
-- identity recovery) should move the token, not create a second row that
-- would leave two identities both receiving pushes meant for one device.
CREATE TABLE push_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);

-- Opt-in notification email (2026-08-24, owner's vendor choice: Resend) --
-- deliberately separate from verification/identity: users.email_hash above
-- is a hashed, format-checked signal for a tier that was never actually
-- wired to any code path (migration 085's own comment); this is a real,
-- dialable address the user hands over voluntarily, stored raw because a
-- hash can't be sent to. Same "pseudonymous, not anonymous... if collected
-- at all" carve-out the schema already anticipated for email generally.
-- notification_email_verified_at stays NULL until the confirmation link is
-- clicked (app/src/lib/notifications.ts's sign/verifyNotificationEmailToken)
-- -- prevents both a typo silently going nowhere forever and one person
-- signing a stranger's real address up for notifications about their own
-- activity.
ALTER TABLE users ADD COLUMN notification_email TEXT;
ALTER TABLE users ADD COLUMN notification_email_verified_at TIMESTAMPTZ;
