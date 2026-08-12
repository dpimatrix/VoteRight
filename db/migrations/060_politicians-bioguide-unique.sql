-- Real bug caught testing db/ingest/congress.mjs: politicians.bioguide_id
-- already existed in the schema ("Congress members only") but had no
-- uniqueness constraint, so re-running the ingester created a duplicate
-- politician + office_terms row for every real member instead of updating
-- the existing one -- verified live: running the script twice (once
-- --states=md,va, once for all 50 states) left Maryland and Virginia with
-- 4 U.S. Senator offices each instead of 2, and 19 duplicated House
-- office_terms rows. Dev data cleaned up separately; this migration closes
-- the actual gap so it can't recur.
ALTER TABLE politicians
  ADD CONSTRAINT politicians_bioguide_id_unique UNIQUE (bioguide_id);
