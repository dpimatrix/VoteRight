-- Admin operational alerts + Priority-Wishes (2026-09-03, owner request).
--
-- Closes two real "who's supposed to know?" gaps found live-testing the
-- Android app: a Pending seat flipping to Tracked (coverage-tracking) and
-- a mandate crossing its publish threshold both previously required a
-- staff member to remember to go check an admin screen -- nothing ever
-- told anyone. Both get the same fix: an optional admin alert email,
-- sent to whichever admins hold the relevant screen's access.

-- admin_accounts never had an email column -- TOTP is the login
-- credential (adminAuth.ts), this is purely an alert destination.
-- Nullable and self-managed: an admin who never sets one just never gets
-- alerts, same "opt-in, no silent assumption" posture as the voter-side
-- notification_email column already has.
ALTER TABLE admin_accounts ADD COLUMN email TEXT;

-- races had no timestamp at all before this -- needed so the coverage
-- watchdog script (db/ingest/notify-coverage-changes.mjs) can tell
-- "created since I last checked" apart from "always existed." Existing
-- rows default to now() at migration time; harmless, since the watermark
-- row below also starts at now() in the same migration, so the very
-- first watchdog run doesn't report every already-tracked seat as new.
ALTER TABLE races ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Single global watermark ("last time we told admins about newly-tracked
-- seats"), not a state machine of its own -- same "one settings-shaped
-- row" instinct as other single-row config tables in this schema.
CREATE TABLE coverage_notification_state (
    id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_notified_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO coverage_notification_state (id) VALUES (1);

-- Priority-Wishes: a resident suggests a new priority axis; staff
-- review and decide. Modeled on issue_proposals' own propose -> review
-- -> becomes-official shape (already live for debate topics), not a new
-- governance pattern invented from scratch. An approved wish does NOT
-- automatically become a topic_axes row -- staff still write the final,
-- balanced axis wording (see priorityAxes.ts) using the wish as input;
-- this table records only the suggestion and its disposition.
CREATE TABLE priority_wishes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_id  UUID NOT NULL REFERENCES users(id),
    statement     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note    TEXT,
    decided_by    UUID REFERENCES admin_accounts(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ
);
-- Partial index -- the admin queue only ever lists pending wishes; a full
-- index would carry every decided row forever for no query that needs it.
CREATE INDEX priority_wishes_pending_idx ON priority_wishes (created_at) WHERE status = 'pending';
