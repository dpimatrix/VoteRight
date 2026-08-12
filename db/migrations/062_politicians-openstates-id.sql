-- D6 state-legislature ingester prep. Same shape as migration 060's
-- bioguide_id fix, applied proactively this time instead of after hitting
-- the duplicate-ingestion bug for real: db/ingest/openstates-legislature.mjs
-- needs a UNIQUE identity anchor for state legislators the same way
-- politicians.bioguide_id anchors Congress members, so a re-run reuses an
-- existing politician/office_terms row instead of inserting a duplicate.
-- OpenStates' own person ids (e.g. "ocd-person/0ddc9257-...") are stable
-- and jurisdiction-agnostic, so one column covers all 50 states' state
-- legislators, not just an initial pass.
ALTER TABLE politicians
  ADD COLUMN openstates_id TEXT UNIQUE;
