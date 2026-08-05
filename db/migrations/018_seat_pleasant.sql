-- City of Seat Pleasant, MD: another Prince George's municipality modeled to
-- help close the "unmodeled municipalities" gap (after Bowie #009, College
-- Park #010, Hyattsville #011, Laurel #012, Greenbelt #015, Mount Rainier
-- #016). Real officeholders live-verified 2026-08-05 against: the city's own
-- seatpleasantmd.gov pages (City-Council, Office-of-the-Mayor, Government,
-- Honorable-Kelly-Porter---Mayor, Election-Documents); the city's own
-- official "2024 Unofficial Election Results" PDF (DocumentCenter/View/1461,
-- downloaded and parsed directly -- full precinct-level vote counts, not a
-- secondhand summary); the Maryland Manual's live Seat Pleasant page AND its
-- separate Seat Pleasant Mayors history page (msa.maryland.gov); the
-- Maryland General Assembly's own reprint of Charter Amendment Resolution
-- CA-23-03 (Jan. 2023, amending § C-309); and the FULL official City of Seat
-- Pleasant Charter (Maryland State Archives PDF, msa.maryland.gov/megafile/
-- .../20140058e.pdf -- downloaded and read via pdftotext in its entirety,
-- Sections C-101 through the appendix, not just a search snippet); plus 2021
-- news coverage of a mayoral removal (Washington Post, WUSA9, WJLA, FOX 5
-- DC, NBC4 Washington, all corroborating the same charter section and date).
--
-- CAUGHT A REAL AGGREGATED-SEARCH ERROR, same discipline as the
-- Gardiner/Croslin catch in migration #011: an initial WebSearch summary of
-- the city's own council page named "Gloria L. Sistrunk" as the CURRENT Ward
-- 5 councilmember. She is not. Sistrunk was a Ward 5 member of the PRE-2024
-- council (confirmed via her signature on the Jan. 2023 charter-amendment
-- resolution, alongside Higgs/Love/McCarthy/Raynor/Scott/Wright -- the full
-- 7-member council of that era). The city's own 2024 official election
-- results, the city's own current City-Council page, AND the Maryland
-- Manual all independently agree the CURRENT Ward 5 holder is Garry A.
-- Jones, who won the Sept. 9, 2024 seat. Sistrunk's name is not used
-- anywhere below as a current officeholder.
--
-- ALSO CAUGHT: the city's own "City Council" roster subpage, fetched twice,
-- lists only ONE At-Large member (Shireka McCarthy) alongside the five Ward
-- members -- appears to be a stale/incomplete page. The city's own separate
-- "Government" overview page AND the live Maryland Manual page both
-- independently state the Council has TWO At-Large seats and both name the
-- second seat's holder as Ashley C. Kearney. Modeled as seat_count=2 on the
-- strength of those two independent confirmations, not the incomplete
-- roster subpage.
--
-- GOVERNMENT STRUCTURE: Mayor + 7-member Council (2 At-Large + 5 Ward
-- seats, one per ward), all directly elected, 4-year terms, Charter §
-- C-601: "election for all elective City officers shall be held on the
-- second Monday in September" (Sept. 9, 2024 matches -- 2nd Monday that
-- year). Charter § C-301: "Newly elected Councilpersons shall take office
-- on the first Monday in October following election" -- directly
-- corroborated by the city's own 2024 official ballot questions (raising
-- Council and Mayor pay), both stating their new rates take effect "October
-- 7, 2024" -- the first Monday in October 2024. No separate "term of
-- Mayor" section exists in the charter text obtained, but the matching
-- Oct. 7, 2024 effective date used for the Mayor's own pay raise in the same
-- 2024 ballot question, plus the Maryland Manual's confirmation that
-- Porter's current mayoral term also runs through 2028 on the same cycle as
-- Council, indicate the Mayor takes office on the same date as Council
-- following the same single joint election. Oct. 7, 2024 is used as
-- term_start below for all six offices elected in that cycle.
--
-- FULL ROSTER CONFIRMED, ONE GENUINE MID-CYCLE VACANCY (not a research
-- gap): all 7 council seats plus the Mayor were elected Sept. 9, 2024 in a
-- single joint election (city's own official results, exact vote counts):
-- Mayor: Kelly Porter 323 over former Mayor Eugene W. Grant 245 (Grant's
-- comeback bid failed). At-Large (2 seats): Ashley Kearney 368, Shireka
-- McCarthy 313, unseating incumbent James Wright, Jr. (201). Ward 1: Monica
-- Higgs 78 over Ryan Walters 30. Ward 2: Hope Love 44 over Aretha Stephenson
-- 31. Ward 3: Kizzie Scott 96 over Reveral L. Yeargin 10. Ward 4: Gerald R.
-- Raynor, Sr. 84 over Charl M. Jones 60. Ward 5: Garry Jones 114
-- (apparently unopposed), replacing prior-council member Gloria Sistrunk.
-- Real turnover since: Ward 2's Hope Love died Nov. 4, 2025; Aretha A.
-- Stephenson -- who had run against Love and lost in 2024 -- won the
-- resulting Jan. 16, 2026 special election (Maryland Manual, current live
-- page) to serve the remainder of the 2024-2028 term. This is modeled
-- directly (Stephenson is the current Ward 2 holder, term_start = her
-- special-election date, same "use the election date absent an
-- independently confirmed swearing-in date" convention as Bowie's
-- Estève/Miller entries in migration #009), not glossed over.
--
-- MAYOR'S OWN BACKSTORY, modeled honestly rather than smoothed over: Kelly
-- Porter, Jr. did not start his mayoralty by election. Predecessor Eugene W.
-- Grant (mayor since 2004) forfeited the office Oct. 7, 2021 under Charter
-- § C-310 for missing three consecutive Council meetings without excuse
-- (Washington Post/WUSA9/WJLA/FOX5/NBC4 all confirm). The Council then
-- APPOINTED Porter, sworn in Aug. 15, 2022, to fill that vacancy (per the
-- Maryland Manual's own Mayors history page). Porter then won the office in
-- his own right at the Sept. 9, 2024 regular election, defeating a comeback
-- bid by Grant himself, 323-245. Only the CURRENT (2024, elected) term is
-- modeled in office_terms below, with how_obtained='elected' -- the 2022
-- appointment is mentioned only in the bio text, not modeled as a separate
-- office_terms row, consistent with "current term only" convention already
-- used for Hyattsville and Laurel.
--
-- MIDDLE-INITIAL SPELLING NOTE: the Maryland Manual consistently gives full
-- middle initials (Ashley C. Kearney, Shireka S. McCarthy, Monica M. Higgs,
-- Aretha A. Stephenson, Kizzie A. Scott, Garry A. Jones); the city's own
-- pages and its own 2024 election-results PDF just as consistently omit
-- them. Full names below use the Manual's fuller form; this is a formatting
-- variant between two of the city's own/state's own sources, not a
-- different-person discrepancy (Gerald R. Raynor, Sr. is spelled
-- identically everywhere).
--
-- COUNCIL PRESIDENT: Charter § C-305 ("Vice-Mayor and President Pro Tem")
-- confirms the Council elects a President from among its own members, who
-- acts as Vice-Mayor -- an internally-rotating role (Maryland Manual: chosen
-- each September, 1-year term), not modeled as a separate office, same
-- convention as Hyattsville/Greenbelt's Council President/Vice President
-- titles. Currently held by Ward 1's Monica M. Higgs per the live Manual
-- page; a 2023-dated Manual snapshot names McCarthy as President for that
-- earlier year -- consistent with annual rotation, not a contradiction.
--
-- is_partisan set FALSE by inference (no explicit "nonpartisan" charter
-- language found in the full charter text obtained this pass, only a
-- separate, unrelated employee political-activity restriction) --
-- consistent with every other Maryland municipality modeled so far.
--
-- accountability_pathways ROW ADDED THIS TIME (unlike most prior
-- municipalities): Charter § C-310, "Forfeiture of Office," read directly
-- and verbatim from the full official charter text: the Mayor or a
-- Councilperson automatically forfeits office for (1) lacking a
-- qualification, (2) violating an express charter prohibition, (3) a felony
-- conviction, or (4) missing three consecutive regular Council meetings
-- unexcused. This is a real, citable, ALREADY-ENFORCED provision (Grant,
-- Oct. 7, 2021) -- not a citizen-initiated recall and not literally a
-- supermajority-vote requirement, so it is tagged with the closest existing
-- mechanism_type enum value ('supermajority_council_removal', the same
-- bucket used for Prince George's County's narrow §307B disability-removal
-- in migration #005) and the description below says so plainly, same
-- honesty convention as the Fairfax/Arlington "not a ballot-box recall" rows.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:seat_pleasant', 'City of Seat Pleasant', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:seat_pleasant', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — At-Large', 'at_large', 2, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — Ward 1', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — Ward 2', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — Ward 3', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — Ward 4', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('f0000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:md/place:seat_pleasant', 'City Council — Ward 5', 'district', 1, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('f0000000-0000-4000-8000-000000000101', 'Kelly Porter, Jr.', NULL, 'f0000000-0000-4000-8000-000000000001', 'Mayor of Seat Pleasant; won the Sept. 9, 2024 regular election in his own right (323 votes) over a comeback bid by his own predecessor, former Mayor Eugene W. Grant (245 votes). Porter first reached the mayoralty by Council appointment, sworn in Aug. 15, 2022, after Grant forfeited the office Oct. 7, 2021 under Charter § C-310 for missing three consecutive Council meetings without excuse.'),
  ('f0000000-0000-4000-8000-000000000102', 'Ashley C. Kearney', NULL, 'f0000000-0000-4000-8000-000000000002', 'City Council At-Large member; won one of two at-large seats Sept. 9, 2024 with 368 votes (the top vote-getter citywide), unseating incumbent James Wright, Jr. (201 votes).'),
  ('f0000000-0000-4000-8000-000000000103', 'Shireka S. McCarthy', NULL, 'f0000000-0000-4000-8000-000000000002', 'City Council At-Large member; won re-election to one of two at-large seats Sept. 9, 2024 with 313 votes. Served as Council President in a prior council year (per an earlier Maryland Manual edition); the Council-President role rotates annually each September (Charter § C-305) and is currently held by Ward 1''s Monica M. Higgs.'),
  ('f0000000-0000-4000-8000-000000000104', 'Monica M. Higgs', NULL, 'f0000000-0000-4000-8000-000000000003', 'City Council Ward 1 member and current Council President (chosen by the Council each September for a 1-year term, per Charter § C-305 and the Maryland Manual); won re-election Sept. 9, 2024 with 78 votes to Ryan Walters'' 30.'),
  ('f0000000-0000-4000-8000-000000000105', 'Aretha A. Stephenson', NULL, 'f0000000-0000-4000-8000-000000000004', 'City Council Ward 2 member; ran against incumbent Hope Love in the Sept. 9, 2024 regular election and lost (31 votes to Love''s 44), then won the Jan. 16, 2026 special election to fill the vacancy created by Love''s death on Nov. 4, 2025, serving the remainder of the 2024-2028 term.'),
  ('f0000000-0000-4000-8000-000000000106', 'Kizzie A. Scott', NULL, 'f0000000-0000-4000-8000-000000000005', 'City Council Ward 3 member; won re-election Sept. 9, 2024 with 96 votes to Reveral L. Yeargin''s 10.'),
  ('f0000000-0000-4000-8000-000000000107', 'Gerald R. Raynor, Sr.', NULL, 'f0000000-0000-4000-8000-000000000006', 'City Council Ward 4 member; won re-election Sept. 9, 2024 with 84 votes to Charl M. Jones'' 60.'),
  ('f0000000-0000-4000-8000-000000000108', 'Garry A. Jones', NULL, 'f0000000-0000-4000-8000-000000000007', 'City Council Ward 5 member; won the Sept. 9, 2024 election (114 votes, apparently unopposed per the city''s own official results), succeeding prior-council Ward 5 member Gloria Sistrunk.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000102', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000103', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000104', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000105', '2026-01-16', 'elected'),
  ('f0000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000106', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000107', '2024-10-07', 'elected'),
  ('f0000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000108', '2024-10-07', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:seat_pleasant', id, 'supermajority_council_removal', TRUE,
  'City of Seat Pleasant Charter § C-310 (Forfeiture of Office)',
  NULL,
  'Not a citizen-initiated recall and not literally a supermajority-vote requirement: the Mayor or any Councilperson automatically forfeits office upon (1) lacking any qualification for the office prescribed by the Charter or by law, (2) violating an express prohibition of the Charter, (3) a felony conviction, or (4) missing three consecutive regular Council meetings without being excused by the Council. Real-world precedent: Mayor Eugene W. Grant forfeited the Seat Pleasant mayoralty under this exact provision on Oct. 7, 2021 after missing three consecutive meetings -- the vacancy that eventually led to Kelly Porter''s Aug. 15, 2022 Council appointment as his successor.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:seat_pleasant';
