-- D6 gap #5: congressional/state-legislative district precision on the
-- ballot. Until now `ballotForJurisdiction` showed every district-seat
-- office in a resident's state (all 8 MD House districts, all 47 MD
-- Senate districts) since the app only tracked residence at the
-- county/municipality level -- an honest disclosure banner covered the
-- gap (`ballot_districts_note` in i18n.ts), but the real fix needed
-- knowing which SPECIFIC district a resolved address falls in.
--
-- The U.S. Census geocoder -- already the production resolver
-- (lib/jurisdictions.ts resolveJurisdiction) -- returns congressional and
-- state-legislative-district geographies in the exact same API call
-- already being made for county/place resolution, at no extra cost:
-- confirmed live this session that requesting the "119th Congressional
-- Districts", "State Legislative Districts - Upper", and "... - Lower"
-- layers alongside the existing Counties/Incorporated Places layers
-- returns a clean district number (BASENAME, e.g. "8", "17", "34A" for
-- Maryland's split sub-districts) for a real test address.
--
-- These three columns store that resolution on the user record itself
-- (same place residence_jurisdiction_id already lives), refreshed
-- whenever verifyAddress() re-resolves an address -- same "always
-- follows the latest verified address" rule already documented there.
-- Nullable: a pre-existing verified user has no district data until
-- their next re-verification, and the dev fallback resolver (no network)
-- still can't produce district numbers, so the ballot page's existing
-- disclosure banner remains the honest answer whenever these are NULL.
--
-- County-council districts are NOT covered by this migration or the
-- resolver change that populates it -- county council districts aren't a
-- Census TIGER geography the way congressional and state-legislative
-- districts are, so there's no equivalent free layer to request. The
-- disclosure banner stays in place for county-level district seats;
-- this migration only removes it for federal and state seats, where a
-- real per-address answer now exists.
ALTER TABLE users
  ADD COLUMN congressional_district TEXT,
  ADD COLUMN state_senate_district TEXT,
  ADD COLUMN state_house_district TEXT;
