-- Town of Brentwood, MD: fifth of the PG "town" tier (after Cheverly #019,
-- Bladensburg #020, Berwyn Heights #021, Edmonston #022). Real
-- officeholders live-verified 2026-08-05 against the town's own
-- brentwoodmd.gov Mayor and Council page and the actual Charter of the
-- Town of Brentwood (Maryland State Archives PDF, msa.maryland.gov,
-- extracted via pdftotext after WebFetch couldn't parse it).
--
-- GOVERNMENT: Mayor + 4 Councilmembers, ALL elected at-large together (no
-- wards, no staggering), 2-year terms, elections held every second year.
-- is_partisan = FALSE DIRECTLY CONFIRMED, not inferred: search results
-- quote the charter's own election-rules language verbatim: "the ballots
-- show the name of each candidate arranged in alphabetical order by office
-- with no party designation of any kind."
--
-- TERM-START DATE: directly confirmed rule -- "the newly elected Mayor and
-- Councilmembers take office on the Tuesday immediately following the
-- first Monday in May." Current term runs May 2025-2027 (per the town's
-- own site); the first Monday in May 2025 is May 5, so the following
-- Tuesday, May 6, 2025, is used as term_start -- derived from the charter
-- rule, not a guess.
--
-- No accountability_pathways row added: the Charter's vacancy sections
-- (310.0/311.0, read via pdftotext, no "recall" match anywhere in the
-- document) describe only involuntary vacancy via death, resignation, or
-- removal from residency, filled by Council appointment or a special
-- election within 90-120 days -- no citizen recall or petition-based
-- removal mechanism was found. Same already-honest gap as Bowie, College
-- Park, Hyattsville, Laurel, New Carrollton, Bladensburg, and Edmonston.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:brentwood', 'Town of Brentwood', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('15000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:brentwood', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('15000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:brentwood', 'Town Council — At-Large', 'at_large', 4, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('15000000-0000-4000-8000-000000000101', 'Rocio Treminio-Lopez', NULL, '15000000-0000-4000-8000-000000000001', 'Mayor of Brentwood; current term May 2025-2027.'),
  ('15000000-0000-4000-8000-000000000102', 'Jerry Burgess', NULL, '15000000-0000-4000-8000-000000000002', 'Town Council member (Vice Mayor); current term May 2025-2027.'),
  ('15000000-0000-4000-8000-000000000103', 'Glenn Harris Jr.', NULL, '15000000-0000-4000-8000-000000000002', 'Town Council member; current term May 2025-2027.'),
  ('15000000-0000-4000-8000-000000000104', 'Juan Arango Millan', NULL, '15000000-0000-4000-8000-000000000002', 'Town Council member; current term May 2025-2027.'),
  ('15000000-0000-4000-8000-000000000105', 'Julia Elrod', NULL, '15000000-0000-4000-8000-000000000002', 'Town Council member; current term May 2025-2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('15000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000101', '2025-05-06', 'elected'),
  ('15000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000102', '2025-05-06', 'elected'),
  ('15000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000103', '2025-05-06', 'elected'),
  ('15000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000104', '2025-05-06', 'elected'),
  ('15000000-0000-4000-8000-000000000002', '15000000-0000-4000-8000-000000000105', '2025-05-06', 'elected');
