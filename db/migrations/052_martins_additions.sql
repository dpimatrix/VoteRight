-- Village of Martin's Additions, MD: eleventh of Montgomery County's
-- remaining municipalities, and the first of the Chevy-Chase-area
-- cluster (though it doesn't share the "Chevy Chase" name itself).
-- Confirmed live against the real Census geocoder (7013 Brookville Rd --
-- the Village Office's own address uses "Chevy Chase" as its USPS postal
-- city, same quirk already seen at Somerset -> Counties layer: Montgomery
-- County 24/031; Incorporated Places layer: "Martin's Additions
-- village"). level='municipal', parent=Montgomery County's own ocd_id.
--
-- Structure: 5-member Village Council (at-large), 2-year terms, elected
-- in May, staggered 2-3 across two consecutive years (confirmed directly
-- from the village's own election page: "seats open on the Council
-- alternates two seats one year and three seats the next"). No separate
-- Mayor -- the Council chooses a Chair (and Vice-Chair, Treasurer,
-- Secretary -- these three modeled as bio text only, not separate
-- offices, same convention as other towns' internal sub-titles) from
-- among itself every July for 1-year terms in those roles. Real
-- officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- martinsadditions.org): the 2-seat cohort -- Alexa H. Spencer (Vice
-- Chair) and Andrew D. Kauders (Secretary) -- elected May 6, 2025 (term
-- to 2027); the 3-seat cohort -- Chair Arthur J. Alexander, Jeffrey M.
-- Blander (Treasurer), and John Zachary -- elected/re-elected May 23,
-- 2026 (term to 2028). REAL TRANSITION CAUGHT, NOT SMOOTHED OVER: the
-- prior 3-seat cohort included Susan E. Fattig (then Vice-Chair) rather
-- than Zachary -- the village's own current council-and-staff page no
-- longer lists her, replaced by Zachary, indicating she did not continue
-- past the May 23, 2026 election (reason not confirmed -- not retiring
-- vs. losing a contested race, just that the roster changed).
--
-- ACCOUNTABILITY: a real, binding citizen recall exists -- Charter
-- Section 904, extracted via pdftotext from the MGA's charter PDF: 20%
-- petition threshold, grounds required ("failed to perform ... duties in
-- a manner consistent with their fiduciary obligations to the
-- residents," specifically stated), election held within 45 days. The
-- charter text does not specify a particular vote margin for the recall
-- itself (unlike Glen Echo's explicit two-thirds), so none is asserted
-- here.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:martins_additions', 'Village of Martin''s Additions', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30400000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:martins_additions', 'Chair', 'single', 1, 1, FALSE, FALSE, 'municipal'),
  ('30400000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:martins_additions', 'Village Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30400000-0000-4000-8000-000000000101', 'Arthur J. Alexander', NULL, '30400000-0000-4000-8000-000000000001', 'Chair of the Village Council -- chosen by fellow Council members. Council member, re-elected May 23, 2026, term to 2028.'),
  ('30400000-0000-4000-8000-000000000102', 'Jeffrey M. Blander', NULL, '30400000-0000-4000-8000-000000000002', 'Treasurer -- chosen by fellow Council members. Council member, re-elected May 23, 2026, term to 2028.'),
  ('30400000-0000-4000-8000-000000000103', 'John Zachary', NULL, '30400000-0000-4000-8000-000000000002', 'Council member, elected May 23, 2026, term to 2028.'),
  ('30400000-0000-4000-8000-000000000104', 'Alexa H. Spencer', NULL, '30400000-0000-4000-8000-000000000002', 'Vice Chair -- chosen by fellow Council members. Council member, elected May 6, 2025, term to 2027.'),
  ('30400000-0000-4000-8000-000000000105', 'Andrew D. Kauders', NULL, '30400000-0000-4000-8000-000000000002', 'Secretary -- chosen by fellow Council members. Council member, elected May 6, 2025, term to 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30400000-0000-4000-8000-000000000002', '30400000-0000-4000-8000-000000000101', '2026-05-23', 'elected'),
  ('30400000-0000-4000-8000-000000000001', '30400000-0000-4000-8000-000000000101', '2026-05-23', 'appointed'),
  ('30400000-0000-4000-8000-000000000002', '30400000-0000-4000-8000-000000000102', '2026-05-23', 'elected'),
  ('30400000-0000-4000-8000-000000000002', '30400000-0000-4000-8000-000000000103', '2026-05-23', 'elected'),
  ('30400000-0000-4000-8000-000000000002', '30400000-0000-4000-8000-000000000104', '2025-05-06', 'elected'),
  ('30400000-0000-4000-8000-000000000002', '30400000-0000-4000-8000-000000000105', '2025-05-06', 'elected');

-- Real, binding citizen recall -- Charter § 904.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:martins_additions', id, 'municipal_recall', TRUE,
  'Charter of the Village of Martin''s Additions § 904',
  '20% of Qualified Voters',
  'A recall petition against one or more Council members must allege the member failed to perform their duties consistent with their fiduciary obligations to residents, specifically state how, and be signed by 20% of Qualified Voters. If satisfied, a recall election is held within 45 days.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:martins_additions';
