-- City of District Heights, MD: Prince George's fifth municipality modeled
-- (after Bowie #009, College Park #010, Hyattsville #011, Laurel #012). Real
-- officeholders live-verified 2026-08-05 (WebSearch/WebFetch against
-- districtheights.org's own City Commission pages, the City's own Facebook
-- post certifying 2026 election results, the current AND 2023 Maryland
-- Manual archive pages, and the actual Charter of the City of District
-- Heights fetched directly from the Maryland General Assembly's own site,
-- mgaleg.maryland.gov -- not a search-engine summary of it).
--
-- Government: a "Commission" (not "Council") of 4 Commissioners + a Mayor
-- (Charter Art. III §301), all serving 4-year terms. The City is divided
-- into two wards (§509), each electing 2 Commissioners -- but on two
-- DIFFERENT staggered 4-year cycles per §508: "the first Monday in May 2006
-- and every fourth year thereafter" elects the Mayor + one Commissioner per
-- ward together (2006, 2010, ..., 2026, 2030...), while "the first Monday
-- in May 2007 and every fourth year thereafter" elects the OTHER
-- Commissioner per ward (2007, 2011, ..., 2023, 2027...). This exactly
-- explains the two different term-expiration years (2027 vs. 2030) found
-- below -- confirmed from the Charter text itself, not inferred.
--
-- is_partisan = FALSE is DIRECTLY CONFIRMED here, not just inferred by
-- pattern (contrast migration 011's convention): Charter §510 requires
-- ballots/voting machines to show candidate names "arranged in alphabetical
-- order by office with no party designation of any kind."
--
-- DISCREPANCY CAUGHT (same pattern the task warned about, but resolved, not
-- repeated): an early aggregated search summary attributed to "Ballotpedia"
-- returned a City Commission roster of Xander Harcourt (Vice Mayor), Anthony
-- Tilghman (Ward 1), Gyasi Gomez (Ward 2), and Pamela Janifer as "Commissioner
-- Ward 2" rather than Mayor -- names odd enough to look fabricated per the
-- brief given. They were NOT fabricated: a direct WebFetch of the archived
-- 2023mdmanual.msa.maryland.gov page confirmed this was a real roster --
-- just three years stale (that was the 2023-era Commission, before Janifer
-- moved from Ward 2 Commissioner up to Mayor). The live official site, the
-- current (2026) Maryland Manual page, and the City's own Facebook post
-- certifying "the official results of the 2026 Election" all independently
-- and consistently confirm the CURRENT roster used below: Mayor Pamela
-- Janifer, Ward 1 Commissioners Ronald B. Waters and Stephanie Holland,
-- Ward 2 Commissioners Rahsheim Wright and Edwin Green. Cynthia L. Miller
-- (Mayor 2022-2026, per her own "Re-Elect Mayor Cynthia Miller" 2026
-- campaign site) was the outgoing incumbent Janifer defeated/succeeded in
-- the May 4, 2026 election, certified May 5, 2026.
--
-- Confirmed current-term term_start dates for the three May-4-2026 winners
-- (Janifer, Holland, Green) use the Charter's own stated formula, not a
-- guess: §301 says a Commission member's term "expire[s] at 8:15 p.m. on
-- the first Thursday following the election and qualification of their
-- successors." The first Monday in May 2026 (election day, per §508(a)) is
-- May 4, 2026; the first Thursday following it is May 7, 2026.
--
-- HONEST GAP, same convention as migration 012 (Laurel)'s Ward 1/Ward 2
-- second-seat gap: Rahsheim Wright's Ward 2 appointment is solidly sourced
-- -- the City's own Facebook post/announcement dated October 30, 2025
-- states he was appointed by the Mayor and Commission to fill a Ward 2
-- vacancy, term ending 2027 (the unexpired remainder of the term Gyasi
-- Gomez won in 2023, per the 2023 Manual). Ronald B. Waters' Ward 1 seat is
-- LESS solidly dated: he now holds the exact Ward 1 seat (term expires
-- 2027) previously held by Xander Harcourt, who was still serving as of a
-- Sept. 4, 2025 agenda packet. The City's own site shows a "Ward 1
-- Commission Vacancy" application window that ran Feb. 27 - Mar. 6, 2026.
-- Charter §515(c) requires any Commission vacancy to be filled by
-- Commission appointment for the remainder of the unexpired term -- so
-- Waters' seat almost certainly arose this way, and how_obtained is set to
-- 'appointed' accordingly, but no source directly states the date the
-- Commission voted to seat him. term_start below (2026-03-06, the
-- application window's close date) is a reasonable estimate pending a
-- firmer source, same honesty convention as Bowie migration 009's
-- Estève/Miller entries -- NOT a fabricated exact date.
--
-- No Vice Mayor office modeled: Charter §308 has the Commission elect a
-- Vice Mayor from among its own sitting members (an internal role, not a
-- separately-elected office) -- confirmed directly from the Charter text,
-- same pattern as Bowie's non-elected "Mayor Pro Tem" role.
--
-- accountability_pathways: TWO rows added, both directly quoted from the
-- actual Charter of the City of District Heights (Md. General Assembly
-- reprint), not inferred or guessed -- Article V §514 (citizen recall by
-- voter petition and special "reaffirm/remove" election) and §515(b) (an
-- internal Commission vote declaring a vacancy after 90 consecutive days'
-- nonperformance). This is a genuine exception to the Rockville/
-- Gaithersburg/Bowie/College Park/Hyattsville/Laurel pattern of skipping
-- this table for lack of a citable provision.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:district_heights', 'City of District Heights', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:district_heights', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('a0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:district_heights', 'City Commission — Ward 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('a0000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:district_heights', 'City Commission — Ward 2', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('a0000000-0000-4000-8000-000000000101', 'Pamela Janifer', NULL, 'a0000000-0000-4000-8000-000000000001', 'Mayor of District Heights; won the May 4, 2026 election (certified May 5, 2026 by the City''s own Board of Supervisors of Elections), succeeding outgoing Mayor Cynthia L. Miller (Mayor since 2022). Previously City Commissioner for Ward 2 (term beginning 2022, expiring 2026) before winning the mayoralty. A retired ~40-year federal employee (FBI and U.S. Dept. of Labor) and District Heights resident of over 20 years.'),
  ('a0000000-0000-4000-8000-000000000102', 'Ronald B. Waters', NULL, 'a0000000-0000-4000-8000-000000000002', 'City Commissioner, Ward 1; currently holds the Ward 1 seat carrying a term expiring 2027 -- the same seat most recently held by Xander Harcourt (in office through at least Sept. 2025). Believed appointed by the Commission per Charter §515(c) to fill the seat''s unexpired term after a Ward 1 vacancy application window ran Feb. 27 - Mar. 6, 2026; the exact appointment date could not be independently confirmed this pass. Also chairs the City''s Charter Committee.'),
  ('a0000000-0000-4000-8000-000000000103', 'Stephanie Holland', NULL, 'a0000000-0000-4000-8000-000000000002', 'City Commissioner, Ward 1; won the May 4, 2026 election, for a term expiring 2030.'),
  ('a0000000-0000-4000-8000-000000000104', 'Rahsheim Wright', NULL, 'a0000000-0000-4000-8000-000000000003', 'City Commissioner, Ward 2; appointed by the Mayor and Commission on October 30, 2025 to fill a Ward 2 vacancy (the unexpired remainder, through 2027, of the term Gyasi Gomez won in 2023). Previously a Congressional staffer for Rep. Donna Edwards (D-MD).'),
  ('a0000000-0000-4000-8000-000000000105', 'Edwin Green', NULL, 'a0000000-0000-4000-8000-000000000003', 'City Commissioner, Ward 2; won the May 4, 2026 election, for a term expiring 2030.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000101', '2026-05-07', 'elected'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000102', '2026-03-06', 'appointed'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000103', '2026-05-07', 'elected'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000104', '2025-10-30', 'appointed'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000105', '2026-05-07', 'elected');

-- NOTE (fixed centrally, not by the drafting pass): accountability_pathways'
-- own CHECK constraint requires office_id IS NOT NULL unless mechanism_type
-- = 'charter_amendment_petition' -- these two mechanisms apply per-office
-- (Mayor + both Commission offices), so they fan out one row per office via
-- SELECT, same pattern as migration 014 (Glenarden), rather than a single
-- office_id-less row.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:district_heights', id, 'municipal_recall', TRUE,
  'City of District Heights Charter Art. V §514 (Recall of Elected Officials); see also §515(a) (vacancy upon recall)',
  '30% of qualified voters citywide to recall the Mayor; 30% of qualified voters of the official''s ward to recall a Commissioner',
  'The Mayor or a Commissioner may be recalled by voter petition presented to the Commission. If the Board of Supervisors of Elections verifies enough valid signatures, a special "reaffirm" or "remove" election is held within 30 days; a majority "remove" vote vacates the seat immediately. A petition may not be initiated before the official has served 6 months of the current term, nor filed after 18 months of it. A recalled official may not be reappointed to fill the resulting vacancy.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:district_heights';

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:district_heights', id, 'supermajority_council_removal', TRUE,
  'City of District Heights Charter Art. V §515(b) (Removal of Commission Members)',
  NULL,
  'If the Mayor or a Commissioner fails to exercise the duties of office for 90 consecutive days, the Commission may declare the seat vacant by the affirmative vote of 4 of its 5 members (Mayor + 4 Commissioners). An internal Commission action distinct from the citizen-petition recall in §514 -- not voter-triggered.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:district_heights';
