-- Chevy Chase Village, MD: one of six real, separate, adjacent Chevy-
-- Chase-named municipalities in Montgomery County (Town of Chevy Chase,
-- Chevy Chase View, Chevy Chase Village, Village of Chevy Chase Section 3,
-- Village of Chevy Chase Section 5, North Chevy Chase -- each with its own
-- charter and elected officials, researched as separate migrations). This
-- is specifically the large, historic "Chevy Chase Village" (chartered
-- 1951, home of Village Hall) -- not Section 3 or Section 5. Confirmed
-- live against the real Census geocoder (5906 Connecticut Ave, Chevy
-- Chase, MD 20815 -- the Village's own Village Hall address -> Counties
-- layer: Montgomery County 24/031; Incorporated Places layer: "Chevy
-- Chase Village town", BASENAME "Chevy Chase Village", GEOID 2416787).
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- STRUCTURE (Charter of Chevy Chase Village, Sections 77-4 and 77-5,
-- Public Local Laws of Montgomery County, current text effective
-- 12/29/2015, read via pdftotext from the MGA's charter PDF after
-- WebFetch returned unparsed binary): a 7-member Board of Managers,
-- elected AT LARGE (not by ward/district) to staggered TWO-YEAR terms
-- (charter §77-5(b): "elected at large for two years to succeed those
-- whose terms are then expiring"). An annual meeting is held the third
-- Monday of April, at which candidates are declared elected unopposed if
-- the number of candidates equals the number of open seats; a contested
-- election (mail ballot) is held the first Saturday in May only if more
-- candidates file than seats. Newly elected/re-elected members take
-- office "at the beginning of the board meeting in June of the election
-- year" (§77-5(e)) -- confirmed in practice as the second Monday of June.
-- The Board elects a Chairman, Vice Chairman, Secretary, Treasurer, and
-- Assistant Treasurer/Assistant Secretary from among its own 7 members
-- (§77-4(b)) -- confirmed from the Board's June 9, 2025 meeting minutes
-- that this "Election of Officers" is redone annually right after new/
-- re-elected members are sworn in (and again per the June 8, 2026 agenda,
-- which lists an "Election of Officers" item). Modeled here the same way
-- as Martin's Additions/Poolesville/Glenarden/Greenbelt: Chairman as a
-- separate single-seat office_terms row with how_obtained='appointed'
-- (term_length_years=1, re-selected annually), alongside the person's
-- real elected Board seat; Vice Chairman/Secretary/Treasurer/Assistant
-- Treasurer/Assistant Secretary are folded into bio text only, not
-- modeled as separate offices, matching the Martin's Additions
-- convention for the same kind of internally-rotated sub-titles.
--
-- Real officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- chevychasevillagemd.gov's own live Board-of-Managers and elections
-- pages, plus the Board's own June 9, 2025 meeting minutes PDF read via
-- pdftotext -- cross-checked against msa.maryland.gov/msa/mdmanual/37mun/
-- chevyvill/, which only lists the Chair's tenure start (2018) and
-- nothing else current, so it wasn't a useful cross-check for the rest
-- of the roster): Chair Elissa A. Leonard, Secretary Saul B. Goodman, and
-- Assistant Treasurer Nancy E. Watters were declared elected unopposed at
-- the April 20, 2026 Annual Meeting (all three candidacies matched three
-- open seats), taking office at the start of the June 8, 2026 board
-- meeting, term to June 2028. Vice Chair Lou Morsberger, Assistant
-- Secretary Linda J. Willard, Treasurer Gary Crockett, and Member David
-- L. Winstead were elected/re-elected in the 2025 cycle and took the Oath
-- of Office at the June 9, 2025 board meeting (confirmed directly from
-- that meeting's minutes), term to June 2027.
--
-- HISTORICAL NOTE, NOT MODELED AS A SEPARATE ROW: per the same June 9,
-- 2025 minutes, Saul B. Goodman was first seated by BOARD APPOINTMENT
-- that same day (filling the remainder of Robert C. Goodwin, Jr.'s
-- vacated term, per Charter §77-4(d)/77-5(f)), months before he stood for
-- and won his own full term at the April 20, 2026 annual meeting -- only
-- his current (2026) term is represented below, consistent with this
-- project's one-current-term-per-office convention.
--
-- ESTIMATED, FLAGGED: no source found gives an exact June 2026 date for
-- the post-election "Election of Officers" re-confirming Leonard as
-- Chair; June 8, 2026 (the confirmed date of that year's organizational
-- board meeting, per the meeting's own agenda, which lists an "Election
-- of Officers" item) is used as the most defensible estimate, same
-- disclosed-estimate discipline used for Poolesville's President/VP
-- dates.
--
-- ACCOUNTABILITY: no recall or removal-by-petition provision was found
-- anywhere in the Village's charter (read in full, Sections 77-1 through
-- 77-17 plus notes, via pdftotext) -- only ordinary vacancy provisions
-- (resignation, death, ceasing to reside in the Village, failure to
-- qualify) filled by Board appointment until the next annual election.
-- The Village's own Charter Revisions page (chevychasevillagemd.gov/287/
-- Chevy-Chase-Village-Charter-Revisions) confirms the 2015 charter text
-- reviewed here is the current one (effective 12/29/2015) and does not
-- reference any recall provision, proposed or adopted. Left as an
-- honest, confirmed gap -- no accountability_pathways row is inserted.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:chevy_chase_village', 'Chevy Chase Village', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30700000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:chevy_chase_village', 'Chairman', 'single', 1, 1, FALSE, FALSE, 'municipal'),
  ('30700000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:chevy_chase_village', 'Board of Managers', 'at_large', 7, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30700000-0000-4000-8000-000000000101', 'Elissa A. Leonard', NULL, '30700000-0000-4000-8000-000000000001', 'Chairman of the Chevy Chase Village Board of Managers -- chosen by fellow Board members, and its Chair continuously since 2018. Board of Managers member, declared elected unopposed April 20, 2026, term to 2028.'),
  ('30700000-0000-4000-8000-000000000102', 'Lou Morsberger', NULL, '30700000-0000-4000-8000-000000000002', 'Vice Chair of the Board of Managers -- chosen by fellow Board members. Board of Managers member, elected/re-elected 2025, sworn in June 9, 2025, term to 2027.'),
  ('30700000-0000-4000-8000-000000000103', 'Saul B. Goodman', NULL, '30700000-0000-4000-8000-000000000002', 'Secretary of the Board of Managers -- chosen by fellow Board members. Board of Managers member; first seated by Board appointment June 9, 2025 to fill a vacated term, then declared elected unopposed to his own full term April 20, 2026, term to 2028.'),
  ('30700000-0000-4000-8000-000000000104', 'Linda J. Willard', NULL, '30700000-0000-4000-8000-000000000002', 'Assistant Secretary of the Board of Managers -- chosen by fellow Board members. Board of Managers member, elected/re-elected 2025, sworn in June 9, 2025, term to 2027.'),
  ('30700000-0000-4000-8000-000000000105', 'Gary Crockett', NULL, '30700000-0000-4000-8000-000000000002', 'Treasurer of the Board of Managers -- chosen by fellow Board members. Board of Managers member, elected/re-elected 2025, sworn in June 9, 2025, term to 2027.'),
  ('30700000-0000-4000-8000-000000000106', 'Nancy E. Watters', NULL, '30700000-0000-4000-8000-000000000002', 'Assistant Treasurer of the Board of Managers -- chosen by fellow Board members. Board of Managers member, declared elected unopposed April 20, 2026, term to 2028.'),
  ('30700000-0000-4000-8000-000000000107', 'David L. Winstead', NULL, '30700000-0000-4000-8000-000000000002', 'Board of Managers member, elected/re-elected 2025, sworn in June 9, 2025, term to 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000101', '2026-06-08', 'elected'),
  ('30700000-0000-4000-8000-000000000001', '30700000-0000-4000-8000-000000000101', '2026-06-08', 'appointed'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000102', '2025-06-09', 'elected'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000103', '2026-06-08', 'elected'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000104', '2025-06-09', 'elected'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000105', '2025-06-09', 'elected'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000106', '2026-06-08', 'elected'),
  ('30700000-0000-4000-8000-000000000002', '30700000-0000-4000-8000-000000000107', '2025-06-09', 'elected');
