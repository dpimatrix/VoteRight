-- Town of Cottage City, MD: Prince George's "town" tier (after Cheverly
-- #019, Bladensburg #020, Berwyn Heights #021, Edmonston #022, Brentwood
-- #023). Real officeholders live-verified 2026-08-05 against THREE
-- independent current sources that all agree with each other: (1) the
-- Maryland Manual's live page (msa.maryland.gov, raw HTML fetched via curl
-- and read directly, not paraphrased -- gives every current officeholder
-- with ward, role, and term-expiration year); (2) the town's own
-- cottagecitymd.gov "Elected Officials" directory page (fetched via curl
-- with a browser user-agent after the site's root page and WebFetch both
-- returned HTTP 403 -- see access-limitation note below); and (3) the
-- actual Charter of the Town of Cottage City (Maryland General Assembly's
-- November-2024 PDF reprint at mgaleg.maryland.gov, extracted via
-- `pdftotext -layout` after WebFetch could not parse the PDF -- Sections
-- 5, 6, 7, 9, 10A, 11, 14, 21, and 29 read in full, not search-engine
-- snippets).
--
-- ACCESS-LIMITATION NOTE: the town's own root domain (cottagecitymd.gov/)
-- returned HTTP 403 to both WebFetch and a browser-UA curl request
-- (Cloudflare-style block, consistent with the pattern noted for other PG
-- towns this series). Individual subpages one level down (e.g.
-- /government, /commissioners) DID return HTTP 200 to the same curl
-- request and were readable directly -- used as the town's-own-site source
-- above, not abandoned in favor of weaker secondary sources.
--
-- GOVERNMENT STRUCTURE, directly confirmed from Charter Section 6: "The
-- corporate powers of said town shall be vested in...a commission to be
-- known as the Cottage City Commission. Said commission shall be composed
-- of five members, one from each ward, and one to be elected as
-- commissioner at large." Section 5 confirms the town has four wards.
-- Cottage City has NO separately-elected Mayor -- it uses a Town
-- Commission model, one of several in this series (cf. Glenarden #014,
-- where the Council likewise chooses a Mayor from among itself). Charter
-- Section 11: "The commission shall elect a chair, a vice-chair, and a
-- secretary of the commission from among its members." All three are
-- internal designations held by sitting Commissioners, not separate
-- corporate offices with their own election. Following the Glenarden
-- precedent, only the Chair (the town's de facto presiding/public-facing
-- officer, parallel to Glenarden's Mayor) is modeled as its own office
-- below; Vice-Chair and Secretary are noted only in the relevant
-- politician's bio, not modeled as separate offices.
--
-- STAGGERED TERMS -- DIRECTLY CONFIRMED FROM CHARTER TEXT, not inferred:
-- Section 29 states outright: "In even-numbered years the seats from wards
-- 2, 3 and 4 become vacant, and in odd-numbered years the seats from ward
-- 1 and the commissioner at large become vacant." This exactly matches
-- what both the Maryland Manual and the town's own site show today: Ward 1
-- (Salsich) and At-Large (Brooks) show 2027 term-expiration (elected in
-- odd-year 2025); Ward 2 (Durant), Ward 3 (Wheatley), Ward 4 (Campos) show
-- 2028 term-expiration (elected in even-year 2026). Term length is 2 years
-- (Section 6) for all five Commission seats.
--
-- TERM-START DATE, computed from charter text, not guessed: Section 29:
-- elections are "Annually, on the first Monday in May." Section 6: a
-- commissioner's term runs "for a term of two (2) years or until their
-- successors take office," and "the regular term of commissioners shall
-- expire on the second Wednesday of the month in which the election of
-- their successors occurs" -- i.e. new terms begin at the second-Wednesday
-- Commission meeting, confirmed by Section 9 as the annual "organization"
-- meeting ("The May meeting shall be for the purpose of the organization
-- as well as for the conduct of regular business"). Calculated: the 2025
-- election was Monday, May 5, 2025 (first Monday in May 2025), so the 2025
-- term-start (Ward 1, At-Large) is the second Wednesday of May 2025 = May
-- 14, 2025. The 2026 election was Monday, May 4, 2026 (first Monday in May
-- 2026 -- the Maryland Manual's own asterisked note confirms Wheatley and
-- Campos "ran unopposed in May 2026 election"), so the 2026 term-start
-- (Ward 2, Ward 3, Ward 4) is the second Wednesday of May 2026 = May 13,
-- 2026.
--
-- CHAIR TERM-START -- HONEST ESTIMATE, disclosed: the Maryland Manual
-- describes the Chair role as "chosen by Commission, 1-year term," and
-- Section 9 confirms an annual organizational meeting every May, but the
-- charter text obtained this pass (Section 11) does not itself specify a
-- one-year term length or a specific reselection date for Chair/Vice-Chair
-- -- that one-year cadence is sourced to the Maryland Manual, not directly
-- to the charter. Wheatley has held the Chair role continuously since 2020
-- per the Manual's own "Chairs of Town Commission" historical list, so her
-- most recent reappointment date is not independently documented; May 13,
-- 2026 (this cycle's organizational meeting date, computed above) is used
-- as a reasonable, disclosed estimate, same convention as Cheverly's
-- (#019) estimated oath date -- not a fabricated precise reappointment
-- record.
--
-- FULL ROSTER CONFIRMED, NO GAPS: all five Commission seats plus the Chair
-- role are independently confirmed by both the Maryland Manual and the
-- town's own "Elected Officials" directory page, which additionally
-- confirms Salsich currently holds the Secretary role and Campos the
-- Vice-Chair role (both noted in bios only, per the modeling choice
-- above): Julia C. Salsich (Ward 1, Commission Secretary), Joshua E.
-- Durant (Ward 2), Wanda A. Wheatley (Ward 3, Commission Chair), Tom E.
-- Campos (Ward 4, Commission Vice-Chair), John M. Brooks (At-Large). Name
-- forms differ trivially between sources (the town's own directory omits
-- middle initials the Maryland Manual includes, e.g. "Julia Salsich" vs.
-- "Julia C. Salsich") -- same person in every case, not a discrepancy of
-- the kind caught for other towns in this series (e.g. Edmonston's stale
-- "Tracy Gant").
--
-- is_partisan set FALSE -- DIRECTLY CONFIRMED, not inferred: Charter
-- Section 29 states outright that the ballot lists candidates "arranged in
-- alphabetical order by office with no party designation of any kind."
--
-- ACCOUNTABILITY: Charter Section 10A ("Removal of Elected Officials"),
-- read and quoted directly, contains TWO distinct, real mechanisms, both
-- modeled below via the same fan-out pattern as migrations #014/#019
-- (applied to all five Commission seats and the Chair office):
--   (1) A citizen-initiated recall petition (10A(2)): a petition signed by
--   at least 30% of the town's registered voters, stating one of four
--   specific grounds (failure to uphold oath, malfeasance, misfeasance, or
--   nonfeasance), is verified by the Board of Election Supervisors and
--   proceeds to a public hearing within 30 days. UNUSUAL FEATURE, worth
--   flagging plainly: unlike Cheverly's or Glenarden's recall provisions,
--   the final decision here is NOT a binding public special election --
--   it is a vote of the remaining (non-named) Commissioners, and ONLY A
--   UNANIMOUS vote of those remaining Commissioners removes the named
--   official. Modeled as mechanism_type 'municipal_recall' since the
--   charter's own text explicitly calls it "recall" and it is
--   citizen-petition-initiated, but the description below makes the
--   peer-unanimous-vote mechanic explicit rather than implying a direct
--   public vote.
--   (2) An independent, non-citizen-initiated removal power (10A(1)): any
--   Commissioner who fails to uphold the oath of office, commits
--   malfeasance/misfeasance/nonfeasance, or misses three consecutive
--   regular monthly meetings without reasonable excuse is subject to
--   removal by the UNANIMOUS vote of the remaining Commissioners after
--   notice and a hearing -- no citizen petition involved at all. Modeled
--   as mechanism_type 'supermajority_council_removal' (the closest
--   available CHECK-constraint value; the charter's actual threshold is
--   unanimity among remaining Commissioners, stricter than a simple
--   supermajority -- noted explicitly in the description).

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:cottage_city', 'Town of Cottage City', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('18000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:cottage_city', 'Town Commission — Ward 1', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('18000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:cottage_city', 'Town Commission — Ward 2', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('18000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:cottage_city', 'Town Commission — Ward 3', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('18000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:cottage_city', 'Town Commission — Ward 4', 'district', 1, 2, FALSE, TRUE, 'municipal'),
  ('18000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:cottage_city', 'Town Commission — At-Large', 'at_large', 1, 2, FALSE, TRUE, 'municipal'),
  ('18000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:cottage_city', 'Chair, Town Commission', 'single', 1, 1, FALSE, FALSE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('18000000-0000-4000-8000-000000000101', 'Julia C. Salsich', NULL, '18000000-0000-4000-8000-000000000001', 'Town Commission Ward 1 member; also currently serves as Commission Secretary (an internal role, chosen by the Commission from among its members per Charter Section 11). Elected May 5, 2025. Term expires 2027.'),
  ('18000000-0000-4000-8000-000000000102', 'Joshua E. Durant', NULL, '18000000-0000-4000-8000-000000000002', 'Town Commission Ward 2 member; elected May 4, 2026. Term expires 2028.'),
  ('18000000-0000-4000-8000-000000000103', 'Wanda A. Wheatley', NULL, '18000000-0000-4000-8000-000000000003', 'Town Commission Ward 3 member; ran unopposed in the May 4, 2026 election (term expires 2028). Also currently serves as Commission Chair, an internal role chosen by the Commission from among its members (Charter Section 11) that she has held continuously since 2020 per the Maryland Manual''s historical chairs list.'),
  ('18000000-0000-4000-8000-000000000104', 'Tom E. Campos', NULL, '18000000-0000-4000-8000-000000000004', 'Town Commission Ward 4 member; ran unopposed in the May 4, 2026 election (term expires 2028). Also currently serves as Commission Vice-Chair, an internal role chosen by the Commission from among its members per Charter Section 11.'),
  ('18000000-0000-4000-8000-000000000105', 'John M. Brooks', NULL, '18000000-0000-4000-8000-000000000005', 'Town Commission At-Large member; elected May 5, 2025. Term expires 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('18000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000101', '2025-05-14', 'elected'),
  ('18000000-0000-4000-8000-000000000002', '18000000-0000-4000-8000-000000000102', '2026-05-13', 'elected'),
  ('18000000-0000-4000-8000-000000000003', '18000000-0000-4000-8000-000000000103', '2026-05-13', 'elected'),
  ('18000000-0000-4000-8000-000000000004', '18000000-0000-4000-8000-000000000104', '2026-05-13', 'elected'),
  ('18000000-0000-4000-8000-000000000005', '18000000-0000-4000-8000-000000000105', '2025-05-14', 'elected'),
  ('18000000-0000-4000-8000-000000000006', '18000000-0000-4000-8000-000000000103', '2026-05-13', 'appointed');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:cottage_city', id, 'municipal_recall', TRUE,
  'Charter of the Town of Cottage City, Section 10A(2)',
  '30% of the town''s registered voters',
  'A petition signed by at least 30% of the town''s registered voters, presented to the Commission at a regular town meeting, must state one of four specific grounds: failure to uphold the oath of office, malfeasance, misfeasance, or nonfeasance. The Board of Election Supervisors verifies the signatures; if authenticated, a public hearing is held within 30 days at which the Commissioner named in the petition may answer the complaints. UNLIKE a public special-election recall, the final decision here is a vote of the remaining Commissioners (not a citywide vote), and ONLY A UNANIMOUS vote of those remaining Commissioners removes the named official from office.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:cottage_city';

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:cottage_city', id, 'supermajority_council_removal', TRUE,
  'Charter of the Town of Cottage City, Section 10A(1)',
  NULL,
  'Independent of any citizen petition, a Commissioner who fails to uphold the oath of office, commits malfeasance/misfeasance/nonfeasance in office, or fails without reasonable excuse to attend three consecutive regular monthly Commission meetings is subject to removal by the UNANIMOUS vote of the remaining Commissioners, after reasonable notice and a hearing. Stricter than a simple supermajority (the charter requires unanimity among all remaining Commissioners), but modeled under the closest available mechanism_type.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:cottage_city';
