-- Demand-driven jurisdiction provisioning (2026-09-08, owner's idea).
-- Tracks resident DEMAND for a county VoteRight hasn't seeded local
-- ballot detail for yet, without ever storing anyone's raw address --
-- see jurisdictionDemand.ts's own header comment for the full privacy
-- reasoning and jurisdictions.ts's countyNotYetSeeded comment for where
-- this gets populated.
--
-- Only Census-standard state/county FIPS (already computed for ballot
-- routing, never re-derived from anything address-shaped) plus the
-- resident's own existing pseudonymous user_id -- same "one signal per
-- verified user, count self-corrects" shape accountability_campaign_
-- supports already established for a different feature.
CREATE TABLE jurisdiction_demand_signals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_fips    TEXT NOT NULL,
    county_fips   TEXT NOT NULL,
    place_name    TEXT,  -- Census incorporated-place name if the address had one; NULL for unincorporated areas
    user_id       UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (state_fips, county_fips, user_id)
);

CREATE INDEX jurisdiction_demand_signals_locality_idx ON jurisdiction_demand_signals (state_fips, county_fips);

-- New notification type for the "your area is now covered" alert
-- (notifications.ts's own pushCopy). notifications_type_check already
-- exists from migration 094 -- widened rather than dropped, same as
-- migration 102's narrowing of payment_verifications.gateway did in
-- the opposite direction.
ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check,
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('thread_closed', 'ctq_eligible', 'priority_wish_approved', 'priority_wish_rejected', 'jurisdiction_provisioned'));
