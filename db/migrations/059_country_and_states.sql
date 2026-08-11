-- Foundation for federal/state government (D6: Congress.gov + OpenStates
-- ingestion, per docs/DATA-OPS.md's own long-standing sequencing --
-- "Federal officials (later)... State legislators (later)... out of pilot
-- scope until county loop is proven" -- the county loop (Montgomery + PG +
-- Fairfax) is proven now). NO SCHEMA CHANGE: jurisdictions.level already
-- allows 'country' and offices.level already allows 'federal'/'state' --
-- confirmed by reading docs/SCHEMA.sql directly, both were already there
-- unused. This migration is pure data: one country-level jurisdiction row
-- + all 50 states (Census FIPS list, www2.census.gov/geo/docs/reference/
-- state.txt -- mechanical reference data, not per-jurisdiction research).
-- D.C. is deliberately excluded here -- it already exists as its own
-- county-equivalent row (migration 004, level='county') and is not a
-- state; U.S. territories (PR, GU, VI, AS, MP) are also deliberately
-- excluded pending a scope decision, not an oversight.
--
-- The existing recursive ballot-stack query (app/src/lib/jurisdictions.ts
-- ballotForJurisdiction) walks the parent chain with no level-specific
-- logic, so once federal offices are attached to the country row and
-- state offices to each state row, every resident nested anywhere below
-- picks them up automatically -- no code change needed for that part
-- either. Maryland and Virginia's existing state rows (parent_ocd_id was
-- NULL) are reparented to the new country row here; their own county-level
-- children are untouched.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us', 'United States', 'country', NULL)
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips) VALUES
  ('ocd-division/country:us/state:al', 'Alabama', 'state', 'ocd-division/country:us', '01'),
  ('ocd-division/country:us/state:ak', 'Alaska', 'state', 'ocd-division/country:us', '02'),
  ('ocd-division/country:us/state:az', 'Arizona', 'state', 'ocd-division/country:us', '04'),
  ('ocd-division/country:us/state:ar', 'Arkansas', 'state', 'ocd-division/country:us', '05'),
  ('ocd-division/country:us/state:ca', 'California', 'state', 'ocd-division/country:us', '06'),
  ('ocd-division/country:us/state:co', 'Colorado', 'state', 'ocd-division/country:us', '08'),
  ('ocd-division/country:us/state:ct', 'Connecticut', 'state', 'ocd-division/country:us', '09'),
  ('ocd-division/country:us/state:de', 'Delaware', 'state', 'ocd-division/country:us', '10'),
  ('ocd-division/country:us/state:fl', 'Florida', 'state', 'ocd-division/country:us', '12'),
  ('ocd-division/country:us/state:ga', 'Georgia', 'state', 'ocd-division/country:us', '13'),
  ('ocd-division/country:us/state:hi', 'Hawaii', 'state', 'ocd-division/country:us', '15'),
  ('ocd-division/country:us/state:id', 'Idaho', 'state', 'ocd-division/country:us', '16'),
  ('ocd-division/country:us/state:il', 'Illinois', 'state', 'ocd-division/country:us', '17'),
  ('ocd-division/country:us/state:in', 'Indiana', 'state', 'ocd-division/country:us', '18'),
  ('ocd-division/country:us/state:ia', 'Iowa', 'state', 'ocd-division/country:us', '19'),
  ('ocd-division/country:us/state:ks', 'Kansas', 'state', 'ocd-division/country:us', '20'),
  ('ocd-division/country:us/state:ky', 'Kentucky', 'state', 'ocd-division/country:us', '21'),
  ('ocd-division/country:us/state:la', 'Louisiana', 'state', 'ocd-division/country:us', '22'),
  ('ocd-division/country:us/state:me', 'Maine', 'state', 'ocd-division/country:us', '23'),
  ('ocd-division/country:us/state:ma', 'Massachusetts', 'state', 'ocd-division/country:us', '25'),
  ('ocd-division/country:us/state:mi', 'Michigan', 'state', 'ocd-division/country:us', '26'),
  ('ocd-division/country:us/state:mn', 'Minnesota', 'state', 'ocd-division/country:us', '27'),
  ('ocd-division/country:us/state:ms', 'Mississippi', 'state', 'ocd-division/country:us', '28'),
  ('ocd-division/country:us/state:mo', 'Missouri', 'state', 'ocd-division/country:us', '29'),
  ('ocd-division/country:us/state:mt', 'Montana', 'state', 'ocd-division/country:us', '30'),
  ('ocd-division/country:us/state:ne', 'Nebraska', 'state', 'ocd-division/country:us', '31'),
  ('ocd-division/country:us/state:nv', 'Nevada', 'state', 'ocd-division/country:us', '32'),
  ('ocd-division/country:us/state:nh', 'New Hampshire', 'state', 'ocd-division/country:us', '33'),
  ('ocd-division/country:us/state:nj', 'New Jersey', 'state', 'ocd-division/country:us', '34'),
  ('ocd-division/country:us/state:nm', 'New Mexico', 'state', 'ocd-division/country:us', '35'),
  ('ocd-division/country:us/state:ny', 'New York', 'state', 'ocd-division/country:us', '36'),
  ('ocd-division/country:us/state:nc', 'North Carolina', 'state', 'ocd-division/country:us', '37'),
  ('ocd-division/country:us/state:nd', 'North Dakota', 'state', 'ocd-division/country:us', '38'),
  ('ocd-division/country:us/state:oh', 'Ohio', 'state', 'ocd-division/country:us', '39'),
  ('ocd-division/country:us/state:ok', 'Oklahoma', 'state', 'ocd-division/country:us', '40'),
  ('ocd-division/country:us/state:or', 'Oregon', 'state', 'ocd-division/country:us', '41'),
  ('ocd-division/country:us/state:pa', 'Pennsylvania', 'state', 'ocd-division/country:us', '42'),
  ('ocd-division/country:us/state:ri', 'Rhode Island', 'state', 'ocd-division/country:us', '44'),
  ('ocd-division/country:us/state:sc', 'South Carolina', 'state', 'ocd-division/country:us', '45'),
  ('ocd-division/country:us/state:sd', 'South Dakota', 'state', 'ocd-division/country:us', '46'),
  ('ocd-division/country:us/state:tn', 'Tennessee', 'state', 'ocd-division/country:us', '47'),
  ('ocd-division/country:us/state:tx', 'Texas', 'state', 'ocd-division/country:us', '48'),
  ('ocd-division/country:us/state:ut', 'Utah', 'state', 'ocd-division/country:us', '49'),
  ('ocd-division/country:us/state:vt', 'Vermont', 'state', 'ocd-division/country:us', '50'),
  ('ocd-division/country:us/state:wa', 'Washington', 'state', 'ocd-division/country:us', '53'),
  ('ocd-division/country:us/state:wv', 'West Virginia', 'state', 'ocd-division/country:us', '54'),
  ('ocd-division/country:us/state:wi', 'Wisconsin', 'state', 'ocd-division/country:us', '55'),
  ('ocd-division/country:us/state:wy', 'Wyoming', 'state', 'ocd-division/country:us', '56')
ON CONFLICT (ocd_id) DO NOTHING;

-- Maryland and Virginia already existed (migration 004) with parent_ocd_id
-- NULL; reparent them to the new country row and backfill state_fips
-- (both values independently confirmed live via the Census geocoder
-- across every MD/VA migration this project has done: MD=24, VA=51).
UPDATE jurisdictions SET parent_ocd_id = 'ocd-division/country:us', state_fips = '24'
 WHERE ocd_id = 'ocd-division/country:us/state:md';
UPDATE jurisdictions SET parent_ocd_id = 'ocd-division/country:us', state_fips = '51'
 WHERE ocd_id = 'ocd-division/country:us/state:va';
