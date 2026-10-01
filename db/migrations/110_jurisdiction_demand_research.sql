-- AI-research draft step for jurisdiction-demand onboarding (2026-10-01,
-- owner's idea, following the /admin/race-coverage gap investigation).
--
-- One row per (state_fips, county_fips) -- upserted on re-research, not
-- append-only, since this is a live aid to CURRENT onboarding work, not a
-- public record needing history (unlike priority_axes, this content never
-- reaches a resident directly; it only ever helps an admin decide what to
-- build next). Admin-triggered, never automatic: an admin clicks "Research
-- this jurisdiction" on /admin/jurisdiction-demand, which calls the
-- Anthropic API with its server-side web-search tool, and the result
-- (including every source URL the model cited) is saved here for that same
-- admin -- and every other admin with jurisdiction_demand access, via
-- notifyAdmins -- to verify before relying on anything.
CREATE TABLE jurisdiction_demand_research (
    state_fips          TEXT NOT NULL,
    county_fips         TEXT NOT NULL,
    note                TEXT NOT NULL,          -- the model's own drafted answer
    source_urls         JSONB NOT NULL,         -- [{url, title}] cited by the web-search tool
    model_version       TEXT NOT NULL,          -- same transparency precedent as ai_debate_runs' own column
    requested_by_admin  TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (state_fips, county_fips)
);
