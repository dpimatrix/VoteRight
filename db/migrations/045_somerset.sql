-- Town of Somerset, MD: fourth of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (4510
-- Cumberland Ave, Chevy Chase, MD 20815 -> Counties layer: Montgomery
-- County 24/031; Incorporated Places layer: "Somerset town" -- the town's
-- own mailing address uses "Chevy Chase" as its USPS postal city, but the
-- Census place boundary correctly resolves to Somerset itself, not any of
-- the actual Chevy Chase-named municipalities). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- Structure: Mayor (single, at-large) + 5-member Council (at-large), on
-- STAGGERED 2-year terms with elections held in MAY (confirmed via the
-- Maryland Manual's own Somerset page) -- one year's ballot has 3 Council
-- seats, the next has the Mayor + 2 Council seats (confirmed directly by
-- the town's own elections page). Real officeholders live-verified
-- 2026-08-11 (WebSearch/WebFetch against townofsomersetmd.gov and the
-- Maryland Manual): Mayor Rohit Khanna + Councilmembers Robin A. Barr and
-- Erlinda A. Doherty, all from the May 2026 cycle (term to 2028) --
-- succeeding longtime Mayor Jeffrey Z. Slavin (now "Mayor Emeritus"), a
-- real recent transition preserved in the bio text; Councilmembers Debbie
-- L. Heller, Kabir C. Kumar, and Shannon C. Rovak, all from the May 2025
-- cycle (term to 2027) -- the town's own page notes Heller/Kumar/Rovak
-- "ran unopposed; no election held May 2025," so they continued without a
-- contested vote. Heller additionally holds "Council President," a
-- 1-year internally-chosen presiding role separate from Somerset's
-- directly-elected Mayor -- not modeled as its own office (bio text only,
-- same treatment as Vice Mayor roles elsewhere in this project) since
-- Somerset already has a true directly-elected Mayor. ESTIMATED, NOT
-- DIRECTLY CONFIRMED exact election day: no source in this pass gave the
-- specific May date, so the Maryland small-town "first Monday in May"
-- convention is used (May 5, 2025 / May 4, 2026) -- same disclosed-
-- estimate discipline as Poolesville and Bowie's Estève/Miller dates.
--
-- ACCOUNTABILITY: a real, binding citizen recall exists -- Charter
-- Article on "Recall of elected officials" (found as Section 83-11A via
-- search, full text extracted via pdftotext from the MGA's own charter
-- PDF reprint, same technique used throughout). 20% of registered Town
-- voters, reasons must be stated (but no enumerated-grounds restriction
-- like Poolesville's), decided by simple majority in a binding special
-- election.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:somerset', 'Town of Somerset', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2c000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:somerset', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('2c000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:somerset', 'Town Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2c000000-0000-4000-8000-000000000101', 'Rohit Khanna', NULL, '2c000000-0000-4000-8000-000000000001', 'Mayor of Somerset, elected May 2026, succeeding longtime Mayor Jeffrey Z. Slavin (now Mayor Emeritus).'),
  ('2c000000-0000-4000-8000-000000000102', 'Debbie L. Heller', NULL, '2c000000-0000-4000-8000-000000000002', 'Council President -- chosen by fellow Councilmembers for a 1-year term. Council member; ran unopposed, no election held May 2025.'),
  ('2c000000-0000-4000-8000-000000000103', 'Kabir C. Kumar', NULL, '2c000000-0000-4000-8000-000000000002', 'Council member; ran unopposed, no election held May 2025.'),
  ('2c000000-0000-4000-8000-000000000104', 'Shannon C. Rovak', NULL, '2c000000-0000-4000-8000-000000000002', 'Council member; ran unopposed, no election held May 2025. Originally appointed to the Council in 2021, then first elected outright in 2023.'),
  ('2c000000-0000-4000-8000-000000000105', 'Robin A. Barr', NULL, '2c000000-0000-4000-8000-000000000002', 'Council member, elected May 2026.'),
  ('2c000000-0000-4000-8000-000000000106', 'Erlinda A. Doherty', NULL, '2c000000-0000-4000-8000-000000000002', 'Council member, elected May 2026.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2c000000-0000-4000-8000-000000000001', '2c000000-0000-4000-8000-000000000101', '2026-05-04', 'elected'),
  ('2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000102', '2025-05-05', 'elected'),
  ('2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000103', '2025-05-05', 'elected'),
  ('2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000104', '2025-05-05', 'elected'),
  ('2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000105', '2026-05-04', 'elected'),
  ('2c000000-0000-4000-8000-000000000002', '2c000000-0000-4000-8000-000000000106', '2026-05-04', 'elected');

-- Real, binding citizen recall -- Charter § 83-11A.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:somerset', id, 'municipal_recall', TRUE,
  'Charter of the Town of Somerset § 83-11A',
  '20% of registered voters of the Town',
  'A recall petition against the Mayor or any Councilmember must state reasons for the recall and be signed by at least 20% of registered Town voters. If certified, a binding special recall election is held (unless a general election falls within 90 days, in which case the recall question may ride the same ballot); a simple majority "no" (continue in office) or "yes" (remove) vote decides.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:somerset';
