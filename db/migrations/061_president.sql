-- President + Vice President of the United States: the one federal office
-- Congress.gov's API doesn't cover (it's a legislative-branch API), so this
-- is a small hand-verified migration rather than an ingester, matching the
-- established discipline of never guessing a living person's office from
-- training-data memory -- live-verified 2026-08-11 (WebSearch against
-- GovTrack + Wikipedia's "Vice presidency of JD Vance" page): President
-- Donald J. Trump (47th President) and Vice President JD Vance (50th Vice
-- President), both took office January 20, 2025 (the constitutionally
-- fixed inauguration date), term ending January 20, 2029.
--
-- Modeled as TWO separate offices, not one office with the VP folded into
-- bio text (the pattern used elsewhere in this project for genuinely
-- subordinate/internally-chosen roles like Vice Mayor or Council
-- Secretary): the Vice Presidency is a real, independently significant,
-- directly-elected constitutional office (President of the Senate,
-- tie-breaking vote, first in the presidential line of succession) even
-- though it's elected on the same ticket as President via the same
-- election -- both offices are is_elected=TRUE, seat_type='single',
-- term_length_years=4, level='federal', attached to the country-level
-- jurisdiction (migration 059).

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('31000000-0000-4000-8000-000000000001', 'ocd-division/country:us', 'President', 'single', 1, 4, TRUE, TRUE, 'federal'),
  ('31000000-0000-4000-8000-000000000002', 'ocd-division/country:us', 'Vice President', 'single', 1, 4, TRUE, TRUE, 'federal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('31000000-0000-4000-8000-000000000101', 'Donald J. Trump', 'R', '31000000-0000-4000-8000-000000000001', '47th President of the United States, took office January 20, 2025.'),
  ('31000000-0000-4000-8000-000000000102', 'JD Vance', 'R', '31000000-0000-4000-8000-000000000002', '50th Vice President of the United States, took office January 20, 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('31000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000101', '2025-01-20', 'elected'),
  ('31000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000102', '2025-01-20', 'elected');
