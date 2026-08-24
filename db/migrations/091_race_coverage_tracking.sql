-- Race/candidate coverage tracking, detection half (docs/BACKLOG.md,
-- 2026-08-23 entry). The detection query itself needs no new table (it's a
-- LEFT JOIN of offices against races for the current cycle, scoped to
-- jurisdictions with verified residents -- see lib/coverage.ts). This
-- migration is the OTHER half: the prioritization signal, logging which
-- specific Pending seats real address-verified residents actually view, so
-- ingestion effort goes where real people are waiting on it.
--
-- One row per (office, user, day) rather than one row per pageview --
-- ON CONFLICT DO NOTHING means repeat same-day visits don't inflate the
-- count, but a resident checking back on different days (or many distinct
-- residents) still builds a real, growing demand signal over time.
CREATE TABLE pending_seat_views (
    office_id  UUID NOT NULL REFERENCES offices(id),
    user_id    UUID NOT NULL REFERENCES users(id),
    viewed_on  DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (office_id, user_id, viewed_on)
);
