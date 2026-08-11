-- City of Falls Church, VA: a third independent city (alongside Alexandria
-- #036 and City of Fairfax #037), confirmed live against the real Census
-- geocoder (300 Park Ave, Falls Church, VA -> Counties layer: STATE=51,
-- COUNTY=610, NAME="Falls Church city"). Same independent-city tier:
-- level='county', parented directly to the Virginia state row.
--
-- STRUCTURE, DIFFERENT AGAIN FROM ALEXANDRIA/FAIRFAX: 7-member City Council,
-- at-large, 4-year STAGGERED terms (elections in November of odd years --
-- 3 or 4 seats each cycle, never the whole council at once). The Mayor is
-- NOT a directly-elected office here -- same "council selects one of its
-- own" pattern already modeled for Greenbelt/Glenarden, MD (migrations
-- 015/014): with each newly-seated Council, the 7 members elect a Mayor and
-- Vice Mayor from among themselves for a 2-year term. Modeled the same dual-
-- row way: a 'City Council' office (seat_count=7, is_elected=TRUE) holds
-- every directly-elected member; a separate single-seat 'Mayor' office
-- (is_elected=FALSE, term_length_years=2) is filled by internal Council
-- vote, so the Mayor's office_terms row uses how_obtained='appointed' even
-- though the same person's Council-seat row uses 'elected'. Vice Mayor is
-- NOT modeled as its own office (consistent with how Alexandria's Vice
-- Mayor and Gaithersburg's Council Vice-President were handled -- bio text
-- only), since unlike Mayor it isn't tracked as a distinct office anywhere
-- else in this schema.
--
-- Real live-verified facts (WebSearch 2026-08-11, fallschurchva.gov +
-- ARLnow + Falls Church News-Press + Falls Church Pulse): staggered cohorts
-- -- Hardi/Flynn/Underhill won 3 of 7 seats Nov 7, 2023, sworn in at the
-- Jan 8, 2024 organizational meeting (where Hardi, then outgoing Vice
-- Mayor, was chosen the city's first new Mayor in a decade); Connelly/
-- Snyder/Downs (all incumbents) plus new member Agin won the other 4 seats
-- Nov 4, 2025 (Agin replacing Debora Schantz-Hiscott, who didn't seek
-- re-election), seated at the Jan 5, 2026 organizational meeting -- the
-- SAME meeting where the Council re-elected Hardi to a second mayoral term
-- on a genuinely contested 4-3 vote (Councilmember Erin Flynn nominated
-- Marybeth Connelly instead, arguing the mayorship should rotate rather
-- than favor incumbency) and elected Laura Downs Vice Mayor unanimously.
-- Hardi's Mayor office_terms row below is dated to this second-term
-- selection (2026-01-05), not her first (2024-01-08) -- office_terms
-- tracks the current holder, not a full history, same convention used
-- throughout this project.
--
-- Officially nonpartisan ballot (VA-wide convention); no candidate party
-- affiliation was confirmed in this pass for any of the 7, left NULL
-- rather than guessed (same discipline as several Fairfax County/Fairfax
-- City rows).

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, state_fips, county_fips) VALUES
  ('ocd-division/country:us/state:va/place:falls_church', 'City of Falls Church', 'county', 'ocd-division/country:us/state:va', '51', '610')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('25000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:va/place:falls_church', 'Mayor', 'single', 1, 2, FALSE, FALSE, 'county'),
  ('25000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:va/place:falls_church', 'City Council', 'at_large', 7, 4, FALSE, TRUE, 'county');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('25000000-0000-4000-8000-000000000101', 'Letty Hardi', NULL, '25000000-0000-4000-8000-000000000001', 'Mayor of Falls Church, chosen by fellow Councilmembers to a second 2-year term Jan 5, 2026 on a contested 4-3 vote (a colleague nominated a rival for the post, arguing it should rotate). First won a Council seat Nov 7, 2023, sworn in Jan 8, 2024, when she was also first chosen Mayor -- the city''s first new Mayor in a decade.'),
  ('25000000-0000-4000-8000-000000000102', 'Erin Flynn', NULL, '25000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 7, 2023, sworn in Jan 8, 2024.'),
  ('25000000-0000-4000-8000-000000000103', 'Justine Underhill', NULL, '25000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 7, 2023, sworn in Jan 8, 2024.'),
  ('25000000-0000-4000-8000-000000000104', 'Marybeth Connelly', NULL, '25000000-0000-4000-8000-000000000002', 'City Council member, re-elected Nov 4, 2025, seated Jan 5, 2026.'),
  ('25000000-0000-4000-8000-000000000105', 'David F. Snyder', NULL, '25000000-0000-4000-8000-000000000002', 'City Council member, re-elected Nov 4, 2025, seated Jan 5, 2026.'),
  ('25000000-0000-4000-8000-000000000106', 'Laura Downs', NULL, '25000000-0000-4000-8000-000000000002', 'Vice Mayor -- chosen unanimously by fellow Councilmembers Jan 5, 2026. Re-elected to her Council seat Nov 4, 2025, seated Jan 5, 2026.'),
  ('25000000-0000-4000-8000-000000000107', 'Arthur Agin', NULL, '25000000-0000-4000-8000-000000000002', 'City Council member, elected Nov 4, 2025 (chair of the City''s Transportation Commission before running), seated Jan 5, 2026, taking the seat of Debora Schantz-Hiscott, who did not seek re-election.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000101', '2024-01-08', 'elected'),
  ('25000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000101', '2026-01-05', 'appointed'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000102', '2024-01-08', 'elected'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000103', '2024-01-08', 'elected'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000104', '2026-01-05', 'elected'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000105', '2026-01-05', 'elected'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000106', '2026-01-05', 'elected'),
  ('25000000-0000-4000-8000-000000000002', '25000000-0000-4000-8000-000000000107', '2026-01-05', 'elected');

-- Same Virginia judicial-removal statute already used for every other VA
-- jurisdiction in this project.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:va/place:falls_church', id, 'municipal_recall', TRUE,
  'Va. Code Ann. § 24.2-230 et seq. (Removal of Public Officers from Office), esp. § 24.2-233',
  '10% of the votes cast in the officer''s last election',
  'Not a ballot-box recall: registered voters petition the Circuit Court for removal on specific statutory grounds (neglect of duty, misuse of office, or certain criminal convictions). A judge, not the electorate, decides whether to remove the officer.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:va/place:falls_church';
