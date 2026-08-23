-- Duplicate-campaign detection (2026-08-23). Owner found 3 byte-identical
-- reform campaigns ("Reduce & Balance Montgomery County Budget", same
-- description, same user, created minutes apart -- clearly repeated
-- testing of the same submit flow, not 3 distinct efforts). Asked for
-- suggest-not-block detection at campaign-creation time, same spirit as
-- the debates composer's claim heuristic (prompt, don't block).
--
-- pg_trgm (trigram similarity) is a standard Postgres contrib extension --
-- available on Neon (production) with no new infrastructure, no
-- third-party service, no keystream leaving this app's own server (so it
-- doesn't run into the VERIFY-FLOW no-third-party-autocomplete rule, which
-- was specifically about a third party seeing partial keystrokes).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on reform_title -- the free-text field reform campaigns
-- get typed into; politician campaigns are matched by (politician_id,
-- pathway_id) instead, which is already indexable via ordinary equality
-- (see accountability.ts's similarCampaigns()), so no index needed there.
CREATE INDEX IF NOT EXISTS idx_accountability_campaigns_reform_title_trgm
    ON accountability_campaigns USING gin (reform_title gin_trgm_ops);
