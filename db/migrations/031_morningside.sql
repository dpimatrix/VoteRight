-- Town of Morningside, MD: PG "town" tier. Real officeholders live-verified
-- 2026-08-05/06 against: the Maryland Manual's live page (msa.maryland.gov,
-- gives every officeholder with term-expiration year -- but see the stale-
-- data catch below); the town's own morningsidemd.gov Town Administration /
-- Mayor's Office / Town Council pages; two somdnews.com "Enquirer-Gazette"
-- community-column articles that directly cover the town's own May 2025 and
-- May 2026 elections (byline: Mary McHale, Morningside columnist -- these
-- returned HTTP 429 to WebFetch and were instead pulled via
-- `curl -L -A "Mozilla/5.0..."`, per the fallback instructions); and the
-- actual Charter of the Town of Morningside (Maryland General Assembly's
-- 2008 PDF reprint -- WebFetch could not parse the compressed PDF stream,
-- so the file it saved locally was run through `pdftotext -layout`, which
-- worked -- the full ~67-section charter was read in full, not a snippet).
--
-- GOVERNMENT STRUCTURE, directly confirmed from Charter Section 52-3 ("Type
-- of government"): "All legislative powers of the town shall be vested in a
-- Council consisting of four Council Members and a Mayor, all to be elected
-- at large" -- no wards. "All Council Members shall be elected to hold
-- office for overlapping terms of two years" -- genuine per-seat staggering
-- (two of the four Council seats up for election each year, on a fixed
-- rotation dating to a one-time transitional split in the May 1974
-- election), confirmed, not assumed. Section 52-14 confirms the Mayor's
-- term is a separate 3-year cycle. Modeled as ONE at-large Council office
-- (seat_count=4) carrying two different term_start dates across its four
-- current officeholders, same pattern as Berwyn Heights (#021) uses for a
-- single at-large multi-seat office -- not modeled as fake wards.
--
-- TERM-START DATE, not a guess: Charter Sections 52-3 and 52-14 both fix it
-- by formula -- officials "take office on the second Monday following
-- [the] election." Morningside holds its "general municipal election" on
-- the first Monday in May every year (Section 52-29a). This was directly
-- cross-validated twice against real reported swearing-in dates: the May 5,
-- 2025 election (a Monday) yields a second-following-Monday of May 19,
-- 2025 -- and the somdnews.com article on that election states outright
-- "Mayor and council were sworn in on May 19"; the May 4, 2026 election (a
-- Monday) yields May 18, 2026 -- and the somdnews.com article on THAT
-- election states "They were sworn in again on May 18." Both real-world
-- dates land exactly on the charter's own formula, giving high confidence
-- in both term_start values used below.
--
-- CAUGHT A REAL STALE-DATA DISCREPANCY (the kind flagged as a recurring
-- pitfall in this series): the Maryland Manual's live page lists Council
-- members John W. Anthony, Jr. and Sharon A. Fowler with term-expiration
-- year "2026" -- but a somdnews.com article published June 8, 2026 directly
-- reports that Morningside's May 4, 2026 town election saw Anthony and
-- Fowler BOTH run unopposed and be re-elected, sworn in May 18, 2026 --
-- meaning their CURRENT term in fact runs 2026-2028, not "expires 2026" as
-- the Manual's page still showed as of this pass (evidently not yet
-- refreshed after that election, even though the Manual's entry for Mayor
-- Wade HAD been updated to his current 2025-2028 term). The corrected,
-- cross-validated 2026-05-18 term_start is used below for both, not the
-- Manual's stale figure.
--
-- CAUGHT A SECOND DISCREPANCY, internal to a single source, and resolved:
-- the somdnews.com article on the May 5, 2025 election states in one
-- paragraph that "Other candidates for mayor were Robin Lee-Stroman and
-- Todd Mullins" (implying Mullins ran for Mayor and lost to Wade's 59
-- votes), then in the very next paragraph states "R. David Chambers and
-- Todd Mullins were elected -- or re-elected -- to the town council"
-- (implying Mullins ran for, and won, a Council seat). Both cannot be true:
-- Charter Section 52-28 ("Nominations") states explicitly, "No candidate
-- shall file for election to more than one public office at any one
-- election." This is treated as a columnist error in the source (the two
-- candidate lists appear to have been mixed up across the two races), not
-- as a real dual candidacy -- resolved using the independent, authoritative
-- Maryland Manual, which confirms Mullins as a current TOWN COUNCIL member
-- (not Mayor). Mullins is modeled as a Council officeholder only, below.
--
-- VICE-MAYOR: Charter Section 52-8 ("Chairman of Council, Designation of
-- Vice-Mayor") confirms the Vice-Mayor is not separately elected -- "The
-- Mayor shall designate a member of the Council as Vice-Mayor" -- an
-- internal role assigned to one of the four sitting Council members, not a
-- distinct office. Not modeled as a separate row. The town's own site notes
-- the Vice-Mayor role is currently vacant (pending the Mayor's designation).
--
-- is_partisan set FALSE: the full charter text (all ~67 substantive
-- sections, read via pdftotext, not a search-engine snippet) was searched
-- in full for "party"/"partisan" and contains zero references of any kind
-- to political parties or a party-designation mechanism -- consistent with,
-- but not more explicitly confirmed than, every other Maryland municipality
-- modeled so far in this series (same inferred-not-explicit convention as
-- Edmonston #022, Brentwood #023).
--
-- No accountability_pathways row added -- a CONFIRMED absence, not an
-- access gap: the full charter (all section headings plus full text of
-- every section actually enacted) was read via pdftotext. The only
-- "Removal" section in the whole document is Section 52-22, which applies
-- solely to removing a member of the Board of Supervisors of Elections for
-- cause by Council vote -- not a mechanism for removing the Mayor or a
-- Council Member. Section 52-11 ("Vacancies in Council") is likewise only
-- an automatic-vacancy-on-three-missed-meetings provision (plus a
-- petition-triggered special election to FILL an already-vacant seat), not
-- a citizen recall of a sitting officeholder. No "Recall" section exists
-- anywhere in the table of contents or body. Same honest gap as Bowie,
-- College Park, Hyattsville, Laurel, New Carrollton, Bladensburg, Edmonston,
-- and Brentwood.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:morningside', 'Town of Morningside', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('1d000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:morningside', 'Mayor', 'single', 1, 3, FALSE, TRUE, 'municipal'),
  ('1d000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:morningside', 'Town Council — At-Large', 'at_large', 4, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('1d000000-0000-4000-8000-000000000101', 'Bradley A. Wade', NULL, '1d000000-0000-4000-8000-000000000001', 'Mayor of Morningside; re-elected May 5, 2025 with 59 votes over Robin Lee-Stroman, sworn in May 19, 2025 for a 3-year term. Term expires 2028.'),
  ('1d000000-0000-4000-8000-000000000102', 'R. David Chambers', NULL, '1d000000-0000-4000-8000-000000000002', 'Town Council member; won election May 5, 2025, sworn in May 19, 2025 for a 2-year term. Term expires 2027.'),
  ('1d000000-0000-4000-8000-000000000103', 'Todd E. Mullins', NULL, '1d000000-0000-4000-8000-000000000002', 'Town Council member; won election May 5, 2025, sworn in May 19, 2025 for a 2-year term. Term expires 2027. (The town-beat news source covering this election also names a "Todd Mullins" as a Mayoral candidate that year -- almost certainly a reporting mix-up given the Charter''s one-office-per-candidate rule; the Maryland Manual independently confirms this Mullins as a Council officeholder, not Mayor.)'),
  ('1d000000-0000-4000-8000-000000000104', 'John W. Anthony, Jr.', NULL, '1d000000-0000-4000-8000-000000000002', 'Town Council member; ran unopposed and was re-elected May 4, 2026, sworn in May 18, 2026 for a 2-year term. Term now runs through 2028 (the Maryland Manual''s live page had not yet been updated past his prior 2024-2026 term as of this pass).'),
  ('1d000000-0000-4000-8000-000000000105', 'Sharon A. Fowler', NULL, '1d000000-0000-4000-8000-000000000002', 'Town Council member; ran unopposed and was re-elected May 4, 2026, sworn in May 18, 2026 for a 2-year term. Term now runs through 2028 (same stale-Maryland-Manual caveat as John W. Anthony, Jr.).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('1d000000-0000-4000-8000-000000000001', '1d000000-0000-4000-8000-000000000101', '2025-05-19', 'elected'),
  ('1d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000102', '2025-05-19', 'elected'),
  ('1d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000103', '2025-05-19', 'elected'),
  ('1d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000104', '2026-05-18', 'elected'),
  ('1d000000-0000-4000-8000-000000000002', '1d000000-0000-4000-8000-000000000105', '2026-05-18', 'elected');
