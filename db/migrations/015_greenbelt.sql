-- City of Greenbelt, MD: Prince George's fifth municipality modeled (after
-- Bowie #009, College Park #010, Hyattsville #011, Laurel #012). Real
-- officeholders live-verified 2026-08-05 (WebSearch/WebFetch against
-- greenbeltmd.gov's own City Council and Election-Results-2025 pages, the
-- Maryland General Assembly's own official reprint of the City of
-- Greenbelt Charter at mgaleg.maryland.gov -- read in full, all 74
-- sections -- and cross-checked against Ballotpedia and Greenbelt News
-- Review).
--
-- GOVERNMENT STRUCTURE -- VERIFIED, NOT ASSUMED: Greenbelt is exactly the
-- historically-unusual case the task flagged. Charter Section 4(a): all
-- seven (7) council members are "nominated and elected from the city at
-- large" (no wards/districts at all -- unlike Bowie/Hyattsville/Laurel),
-- for two-year terms, with the whole council elected together every odd
-- year (Section 14(a): first Tuesday following the first Monday of
-- November). Charter Section 6, quoted directly: "At its first meeting
-- following a regular municipal election the council shall choose one of
-- its members as mayor, and shall also choose one of its members as mayor
-- pro tem." This CONFIRMS the mayor is NOT separately/directly elected by
-- voters -- the seat titled "Mayor" is filled by an internal vote of the
-- seven at-large winners, at their first post-election meeting. Modeled
-- accordingly: 'City Council' office (seat_type='at_large', seat_count=7,
-- is_elected=TRUE) holds all 7 winners; a separate single-seat 'Mayor'
-- office (is_elected=FALSE) is filled by council selection, so its
-- office_terms row uses how_obtained='appointed', not 'elected' -- per
-- the task's own guidance for a mayor "genuinely selected by council vote
-- rather than direct popular election." (In practice the top vote-getter
-- has become mayor for years running, per the city's own page, but the
-- charter text makes clear this is convention riding on top of a real
-- internal council vote, not a separate ballot line for "Mayor.")
-- Mayor Pro Tem (currently Kristen L. K. Weaver) is likewise an internal
-- council-selected role, noted only in her bio text, not modeled as a
-- separate office -- same convention as "Council President" / "Council
-- Vice President" titles in the Hyattsville migration (#011).
--
-- CAUGHT: a Greenbelt News Review article titled "43rd Greenbelt City
-- Council Shares Goals, Gives Thanks" surfaced high in search results and,
-- read carelessly, could be mistaken for current coverage -- it is
-- actually 2019-2021 coverage of Mayor Colin A. Byrd's council (confirmed
-- via the city's own "Past Council History" page, which numbers councils
-- sequentially: 43rd=2019-2021/Byrd, 44th=2021-2023/Jordan,
-- 45th=2023-2025/Jordan, 46th=2025-2027/Jordan). The CURRENT council is
-- the 46th, not the 43rd. Same discipline as the Hyattsville
-- Gardiner/Croslin catch in migration #011: trust the city's own dated,
-- numbered history page over an ambiguously-dated news headline.
--
-- FULL ROSTER CONFIRMED -- NO GAPS: unlike Laurel (#012), every one of
-- the 7 at-large seats has a directly confirmed current holder, because
-- all 7 are elected in the same single at-large race each cycle,
-- eliminating the "seat didn't come up this cycle" problem entirely.
-- Nov 4, 2025 official results (greenbeltmd.gov/658/Election-Results-2025,
-- exact vote totals): Emmett V. Jordan 2,408; Kristen L.K. Weaver 2,229;
-- Jenni Pompi 2,146; Danielle P. McKinney 2,124; Frankie Santos Fritz
-- 2,052; Amy Knesel 1,938; Silkie I. Pope 1,812 (top 7 of 10 candidates
-- plus write-ins elected; Rodney M. Roberts, Kevin "Coach K" Lockhart, and
-- Bill Orleans did not win seats). The city's own current "City Council"
-- leadership page spells the seventh winner "Silke Pope" (no "i"); this
-- migration uses that official-page spelling in full_name and notes the
-- ballot-tally spelling variant here -- a minor spelling discrepancy
-- between two of the city's own pages, not a wrong-person error.
--
-- TERM-START DATE: Charter Section 5 -- newly elected members "assume the
-- duties of office" at 7:30 p.m. on "the first Monday following a regular
-- municipal election." Applied to the Nov 4, 2025 election, that is Nov
-- 10, 2025 (independently corroborated by a Facebook video captioned
-- "Tonight, the 46th City Council of Greenbelt was sworn into office").
-- Per Section 6, the mayor and mayor pro tem are also chosen "at its
-- first meeting following" the election, i.e. that same Nov 10, 2025
-- meeting -- so Jordan's Mayor office_terms row uses the same date.
--
-- PARTISANSHIP -- DIRECTLY CONFIRMED, not inferred this time: Charter
-- Section 14(a) states outright, "All elections shall be nonpartisan."
--
-- PENDING BUT NOT YET LAW -- not modeled: Nov 4, 2025 also carried a
-- non-binding advisory referendum asking whether council terms should
-- move from 2 to 4 years (passed by voters, per Ballotpedia), but it
-- required the council to affirmatively enact a charter amendment to take
-- effect, and no search this pass turned up any such enactment as of
-- 2026-08-05. term_length_years is therefore left at 2, matching the
-- Charter's current, still-controlling Section 4(a) text -- worth
-- rechecking in a future pass in case the council has since amended it.
--
-- No accountability_pathways row added: the full charter (all 74
-- sections, read directly from the Maryland General Assembly's own
-- reprint) contains a member-expulsion procedure for disorderly conduct
-- (Section 7, an internal council vote, not a citizen recall) and a
-- removal procedure for the appointed city manager (Section 35), but no
-- citizen recall/removal-by-petition provision for elected officials --
-- same honest gap already on record for Rockville, Gaithersburg, Bowie,
-- College Park, Hyattsville, and Laurel.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:greenbelt', 'City of Greenbelt', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:greenbelt', 'Mayor', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('c0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:greenbelt', 'City Council', 'at_large', 7, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('c0000000-0000-4000-8000-000000000101', 'Emmett V. Jordan', NULL, 'c0000000-0000-4000-8000-000000000001', 'Mayor of Greenbelt; won re-election to an at-large City Council seat Nov 4, 2025 (2,408 votes, highest vote-getter) and was chosen Mayor by his fellow councilmembers at their Nov 10, 2025 reorganization meeting -- his fourth consecutive term as mayor (previously chosen mayor by the 44th and 45th councils, 2021-2025).'),
  ('c0000000-0000-4000-8000-000000000102', 'Kristen L. K. Weaver', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member (Mayor Pro Tem, chosen by the council); won re-election Nov 4, 2025 (2,229 votes).'),
  ('c0000000-0000-4000-8000-000000000103', 'Jenni Pompi', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member; won re-election Nov 4, 2025 (2,146 votes).'),
  ('c0000000-0000-4000-8000-000000000104', 'Danielle P. McKinney', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member; won re-election Nov 4, 2025 (2,124 votes).'),
  ('c0000000-0000-4000-8000-000000000105', 'Frankie Santos Fritz', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member; won a first term Nov 4, 2025 (2,052 votes), the sole newcomer to an otherwise-incumbent council.'),
  ('c0000000-0000-4000-8000-000000000106', 'Amy Knesel', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member; won re-election Nov 4, 2025 (1,938 votes).'),
  ('c0000000-0000-4000-8000-000000000107', 'Silke Pope', NULL, 'c0000000-0000-4000-8000-000000000002', 'City Council member; won re-election Nov 4, 2025 (1,812 votes; recorded as "Silkie I. Pope" on the city''s official vote-tally page, "Silke Pope" on its City Council leadership page -- same person, minor spelling variant between two official pages).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000101', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000101', '2025-11-10', 'appointed'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000102', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000103', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000104', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000105', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000106', '2025-11-10', 'elected'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000107', '2025-11-10', 'elected');
