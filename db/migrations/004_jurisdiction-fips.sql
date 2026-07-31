-- Nationwide expansion, Part 1a: data-driven FIPS -> jurisdiction resolution.
-- Adding a county after this migration is a data insert, not a code change.
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS state_fips TEXT;
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS county_fips TEXT;

-- State-level parents (idempotent - Maryland's row should already exist from the
-- pilot cutover, but this is a no-op if so; Virginia's is genuinely new). Must run
-- before anything below references them via parent_ocd_id's FK.
INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md', 'Maryland', 'state', NULL),
  ('ocd-division/country:us/state:va', 'Virginia', 'state', NULL)
ON CONFLICT (ocd_id) DO NOTHING;

-- Backfill the existing pilot county (Census FIPS: MD = 24, Montgomery County = 031)
-- and link it to its state parent if that wasn't already set.
UPDATE jurisdictions SET state_fips = '24', county_fips = '031'
 WHERE ocd_id = 'ocd-division/country:us/state:md/county:montgomery';
UPDATE jurisdictions SET parent_ocd_id = 'ocd-division/country:us/state:md'
 WHERE ocd_id = 'ocd-division/country:us/state:md/county:montgomery' AND parent_ocd_id IS NULL;

-- New DMV jurisdictions (FIPS pairs live-verified against the Census geocoder):
--   Prince George's County, MD: 24/033
--   Fairfax County, VA:        51/059
--   Arlington County, VA:      51/013
--   Washington, D.C.:          11/001 (D.C. has no separate county layer -- the
--     Census geocoder itself returns it as a county-equivalent, so it slots into
--     the existing county-level stack logic unchanged; no state parent, same as
--     how a state itself has none)
INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
  ('ocd-division/country:us/state:md/county:prince_georges', 'Prince George''s County', 'county', 'ocd-division/country:us/state:md', '24', '033'),
  ('ocd-division/country:us/state:va/county:fairfax', 'Fairfax County', 'county', 'ocd-division/country:us/state:va', '51', '059'),
  ('ocd-division/country:us/state:va/county:arlington', 'Arlington County', 'county', 'ocd-division/country:us/state:va', '51', '013'),
  ('ocd-division/country:us/district:dc', 'District of Columbia', 'county', NULL, '11', '001')
ON CONFLICT (ocd_id) DO NOTHING;
