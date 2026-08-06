-- Town of Colmar Manor, MD: fifth of the PG "town" tier (after Cheverly #019,
-- Bladensburg #020, Berwyn Heights #021, Edmonston #022; Brentwood #023 and
-- Capitol Heights #024 also intervene in the file numbering). Real
-- officeholders live-verified 2026-08-05 against: the Maryland Manual's live
-- page (msa.maryland.gov/msa/mdmanual/37mun/colmar/html/c.html -- gives
-- every current officeholder, Mayor's term-expiration year, and Council's
-- shared term-expiration year, verbatim), the town's own colmarmanor.org
-- government pages (elected officials, town elections), the actual Charter
-- of the Town of Colmar Manor (Maryland General Assembly's November 2024
-- PDF reprint, extracted via pdftotext after WebFetch returned only binary
-- garbage on it -- Articles III and V read in full), and the town's own
-- October 15, 2024 Town Meeting Minutes PDF (also extracted via pdftotext
-- after WebFetch failed on it), which independently corroborates the Ward 1
-- vacancy chain below.
--
-- GOVERNMENT STRUCTURE, directly confirmed from Charter Section 301: "All
-- powers of the Town are vested in a Town Council consisting of a Mayor and
-- four Councilmembers" -- one per ward, four wards, no at-large Council
-- seats; the Mayor is separately, directly elected at-large (Section
-- 302(c)). Both directly-elected, not a council-selects-mayor model.
--
-- ELECTION CYCLES, directly confirmed from Charter Section 302: (a)
-- Councilmembers (all four wards together) are elected "on the first
-- Tuesday in May 2004 and every four (4) years thereafter" -- i.e. 2004,
-- 2008, ..., 2024, 2028; the Council itself does NOT stagger seat-by-seat.
-- (c) The Mayor is separately elected "on the first Tuesday in May 2006 and
-- every four (4) years thereafter" -- i.e. 2006, ..., 2022, 2026, 2030 --
-- a 4-year term like Council's, just offset two years from the Council's
-- cycle (same kind of cross-office cycle offset seen at Cheverly, though
-- there it also mismatched term LENGTH; here both terms are 4 years, only
-- the cycle start differs). All terms are 4 years per Charter Sections
-- 302(a)/(c).
--
-- VACANCY / SPECIAL ELECTION MACHINERY, directly confirmed from Charter
-- Section 306: a vacancy occurring with 6+ months remaining before the next
-- Town election triggers a special election on "the forty-fifth (45) day
-- following the occurrence of the vacancy" (306(b)-(d)); a vacancy with
-- LESS than 6 months remaining is instead filled "at the next Town
-- election" (306(e)). The winner of either kind of special election serves
-- only "the remainder of the vacated term," not a fresh 4-year term. TWO of
-- the current four Council seats were filled this way, not by the regular
-- 2024 cycle election:
--   * Ward 1: the town's own October 15, 2024 Meeting Minutes record
--     Councilmember Travonte Jenkins announcing his resignation "effective
--     today, October 15, 2024." Charter's 45-day formula from that date
--     lands exactly on November 29, 2024 -- matching the town's own
--     election-notice page, which independently states the Ward 1 special
--     election was held November 29, 2024. Melinda L. Mendoza won it.
--   * Ward 3: town sources describe Councilmember Sophia Emeritz resigning
--     effective February 22, 2026 (relocation outside town limits). Under
--     306(e) (less than 6 months before the next Town election, the
--     regularly-scheduled May 5, 2026 Mayor election), this vacancy was
--     filled AT that same May 5, 2026 election rather than a standalone
--     45-day special election. Vivian Jackson won it.
-- Both Mendoza and Jackson serve only the remainder of their predecessors'
-- terms, which is why the Maryland Manual lists ALL FOUR current Council
-- seats -- including these two mid-cycle replacements -- with the SAME
-- 2028 term-expiration year (the 2024 regular-cycle expiration), confirmed
-- verbatim on the Manual's page.
--
-- Ward 2 (Alison B. Pages) and Ward 4 (Fanny A. Roque) were seated in the
-- regular cycle election, first Tuesday in May 2024 = May 7, 2024.
--
-- CAUGHT A STALE-PAGE DISCREPANCY: the town's own council.php subpage
-- currently reads "Mayor: Monica Casañas (Elected May 2022)," which if
-- taken alone would understate her current term. The town's own elections
-- page, the government-structure page, and the Maryland Manual's live page
-- all independently agree she was re-elected in the regular May 5, 2026
-- Mayor election (first elected 2022, per the Manual's mayors-list page
-- showing "2022- Monica M. Casañas" with no gap) and her current term
-- expires 2030 -- council.php is simply an unupdated older subpage, not a
-- different person or a real vacancy. May 5, 2026 (her most recent
-- election) is used as term_start below, not 2022.
--
-- is_partisan set FALSE, DIRECTLY CONFIRMED (not inferred) from Charter
-- Section 505(b), quoted verbatim: "All Town elections shall be conducted
-- on a nonpartisan basis, and no ballot shall carry any party affiliation."
--
-- No accountability_pathways row added: Charter Article V was read in full
-- and contains no citizen recall or petition-based removal mechanism for
-- the Mayor or any Councilmember. The only "removal" provisions found
-- anywhere in the charter apply to appointed positions, not elected
-- officials: Section 503 (Board of Election Supervisors members, removable
-- "for good cause" by the Town Council after a hearing) and Section 1070's
-- area (the Clerk-Treasurer, removable by the Mayor with Council approval).
-- Same already-honest gap as Bowie, College Park, Hyattsville, Laurel, New
-- Carrollton, Bladensburg, Edmonston, and Brentwood.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:colmar_manor', 'Town of Colmar Manor', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('17000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:colmar_manor', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('17000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:colmar_manor', 'Town Council — Ward 1', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('17000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:colmar_manor', 'Town Council — Ward 2', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('17000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:colmar_manor', 'Town Council — Ward 3', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('17000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:colmar_manor', 'Town Council — Ward 4', 'district', 1, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('17000000-0000-4000-8000-000000000101', 'Monica M. Casañas', NULL, '17000000-0000-4000-8000-000000000001', 'Mayor of Colmar Manor, elected at-large; first elected 2022, re-elected in the regular May 5, 2026 election. Term expires 2030.'),
  ('17000000-0000-4000-8000-000000000102', 'Melinda L. Mendoza', NULL, '17000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; won a special election held November 29, 2024, filling the remainder of Travonte Jenkins'' term after his October 15, 2024 resignation. Term expires 2028.'),
  ('17000000-0000-4000-8000-000000000103', 'Alison B. Pages', NULL, '17000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; won the regular Council election held May 7, 2024. Term expires 2028.'),
  ('17000000-0000-4000-8000-000000000104', 'Vivian Jackson', NULL, '17000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; won a special election held May 5, 2026 (combined with that cycle''s regular Mayor election, per Charter Section 306(e)), filling the remainder of Sophia Emeritz''s term after her February 22, 2026 resignation. Term expires 2028.'),
  ('17000000-0000-4000-8000-000000000105', 'Fanny A. Roque', NULL, '17000000-0000-4000-8000-000000000005', 'Town Council Ward 4 member; won the regular Council election held May 7, 2024. Term expires 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('17000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000101', '2026-05-05', 'elected'),
  ('17000000-0000-4000-8000-000000000002', '17000000-0000-4000-8000-000000000102', '2024-11-29', 'elected'),
  ('17000000-0000-4000-8000-000000000003', '17000000-0000-4000-8000-000000000103', '2024-05-07', 'elected'),
  ('17000000-0000-4000-8000-000000000004', '17000000-0000-4000-8000-000000000104', '2026-05-05', 'elected'),
  ('17000000-0000-4000-8000-000000000005', '17000000-0000-4000-8000-000000000105', '2024-05-07', 'elected');
