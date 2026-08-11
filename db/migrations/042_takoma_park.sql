-- City of Takoma Park, MD: first of Montgomery County's 17 remaining
-- incorporated municipalities beyond Rockville (#001-era seed) and
-- Gaithersburg (#006). Confirmed live against the real Census geocoder
-- (6931 Laurel Ave, Takoma Park, MD -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "Takoma Park city"). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- HISTORICAL NOTE, NOT A LIVE ISSUE: Takoma Park used to straddle TWO
-- counties (its eastern half was in Prince George's County, western half
-- in Montgomery), which would have been a genuine structural problem for
-- this schema's one-parent-per-municipality model. A 1995 referendum and
-- subsequent County Council/General Assembly approval fully unified the
-- city into Montgomery County effective July 1, 1997, ending 107 years of
-- divided jurisdiction -- so today it cleanly has exactly one parent.
--
-- Structure: Mayor (single, at-large) + 6 Councilmembers, ONE PER WARD
-- (modeled as 6 separate district-seat offices, same convention as DC's
-- wards/PG's districts), 2-year terms, nonpartisan. A March 2026 proposal
-- to double both to 4-year terms was considered and then explicitly
-- REJECTED by the Council in a March 18, 2026 vote -- current terms remain
-- 2 years, confirmed current, not stale. Real officeholders live-verified
-- 2026-08-11 (WebSearch/WebFetch against takomaparkmd.gov's own
-- councilmember pages and Montgomery Community Media's election-night
-- coverage): Mayor Talisha Searcy, re-elected unopposed Nov 5, 2024;
-- Councilmembers Jessica Landman (Ward 1, new), Cindy Dyballa (Ward 2,
-- re-elected incumbent), Roger Schlegel (Ward 3, new), Kurt Gilbert
-- (Ward 4, new -- a 27-year Takoma Park police officer who defeated Tony
-- Kyere 464-215 to succeed Terry Seamens' 23-year tenure), Cara Honzak
-- (Ward 5, re-elected incumbent), Amy Wesolek (Ward 6, new). All sworn in
-- Nov 18, 2024, just 13 days after the election. (One news source
-- misspelled Gilbert's surname as "Gibson" -- the official city site and
-- multiple independent city documents confirm "Gilbert.") Party
-- affiliation not tracked (nonpartisan municipal elections) -- left NULL.
--
-- ACCOUNTABILITY: a real, detailed, binding citizen recall exists --
-- Charter Section 614, read via pdftotext after WebFetch returned the MGA
-- charter PDF as unparsed binary (Md. General Assembly's own charter
-- reprint, same technique used throughout this project). 20% of
-- registered City voters for the Mayor (citywide), or 20% of registered
-- voters of a Councilmember's own ward for that Councilmember -- genuinely
-- ward-scoped, unlike a citywide-only threshold.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:takoma_park', 'City of Takoma Park', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('29000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:takoma_park', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 1', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 2', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 3', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 4', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 5', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('29000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:md/place:takoma_park', 'City Council — Ward 6', 'district', 1, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('29000000-0000-4000-8000-000000000101', 'Talisha Searcy', NULL, '29000000-0000-4000-8000-000000000001', 'Mayor of Takoma Park, re-elected unopposed Nov 5, 2024.'),
  ('29000000-0000-4000-8000-000000000102', 'Jessica Landman', NULL, '29000000-0000-4000-8000-000000000002', 'Ward 1 Councilmember, elected Nov 5, 2024.'),
  ('29000000-0000-4000-8000-000000000103', 'Cindy Dyballa', NULL, '29000000-0000-4000-8000-000000000003', 'Ward 2 Councilmember, re-elected Nov 5, 2024.'),
  ('29000000-0000-4000-8000-000000000104', 'Roger Schlegel', NULL, '29000000-0000-4000-8000-000000000004', 'Ward 3 Councilmember, elected Nov 5, 2024.'),
  ('29000000-0000-4000-8000-000000000105', 'Kurt Gilbert', NULL, '29000000-0000-4000-8000-000000000005', 'Ward 4 Councilmember, elected Nov 5, 2024 -- a 27-year Takoma Park police officer who defeated Tony Kyere 464-215 to succeed Terry Seamens'' 23-year tenure representing the ward.'),
  ('29000000-0000-4000-8000-000000000106', 'Cara Honzak', NULL, '29000000-0000-4000-8000-000000000006', 'Ward 5 Councilmember, re-elected Nov 5, 2024.'),
  ('29000000-0000-4000-8000-000000000107', 'Amy Wesolek', NULL, '29000000-0000-4000-8000-000000000007', 'Ward 6 Councilmember, elected Nov 5, 2024.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('29000000-0000-4000-8000-000000000001', '29000000-0000-4000-8000-000000000101', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000002', '29000000-0000-4000-8000-000000000102', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000003', '29000000-0000-4000-8000-000000000103', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000004', '29000000-0000-4000-8000-000000000104', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000005', '29000000-0000-4000-8000-000000000105', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000006', '29000000-0000-4000-8000-000000000106', '2024-11-18', 'elected'),
  ('29000000-0000-4000-8000-000000000007', '29000000-0000-4000-8000-000000000107', '2024-11-18', 'elected');

-- Real, binding, ward-scoped citizen recall -- Charter Section 614.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
VALUES ('ocd-division/country:us/state:md/place:takoma_park',
  '29000000-0000-4000-8000-000000000001', 'municipal_recall', TRUE,
  'City of Takoma Park Charter § 614',
  '20% of registered City voters at the time of the most recent general City election',
  'A recall petition against the Mayor requires signatures equal to 20% of registered City voters. A special recall election is then held; a majority "yes" vote removes the Mayor immediately, with no further Council action needed.');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:takoma_park', id, 'municipal_recall', TRUE,
  'City of Takoma Park Charter § 614',
  '20% of registered voters of the Councilmember''s own ward at the time of the most recent general City election',
  'A recall petition against a Councilmember requires signatures equal to 20% of that Councilmember''s ward''s registered voters -- only that ward votes in the resulting recall election. A majority "yes" vote removes the Councilmember immediately.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:takoma_park' AND title LIKE 'City Council%';
