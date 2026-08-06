-- Town of Eagle Harbor, MD: one of the smallest incorporated municipalities
-- in Maryland (2020 census population 67, per the Maryland Manual), located
-- in the far southeast corner of Prince George's County near Aquasco --
-- founded 1929 as a historic African American waterfront community, real
-- and currently governed, despite its very thin web presence. Real
-- officeholders live-verified 2026-08-05 against TWO independent current
-- sources that agree on every name: (1) the Maryland Manual's live Eagle
-- Harbor government page (msa.maryland.gov -- raw HTML fetched directly via
-- curl, not just an aggregated summary), which gives every current
-- officeholder, their portfolio title, and "Terms expire 2027"; and (2) the
-- town's own official website (townofeagleharborincmd.org), specifically
-- its Officials & Staff page headed "2025 - 2027." Cross-checked against
-- the actual Charter of the Town of Eagle Harbor (Maryland General
-- Assembly's 2011 PDF reprint of the charter as amended April 11, 2007,
-- linked directly from the Maryland Manual's own page -- WebFetch reported
-- it as an unreadable image-based PDF, so it was extracted via
-- `pdftotext -layout` on the locally saved file; the OCR layer is noisy in
-- places (e.g. "$" for "§", scrambled word-wrap) but every provision cited
-- below was read in its full surrounding context, not a search snippet).
--
-- GOVERNMENT STRUCTURE -- CONFIRMED DIRECTLY FROM CHARTER TEXT, not
-- inferred: Article II §1 -- "All legislative powers of the Town shall be
-- vested in a corporate body designated as the 'Board of Town
-- Commissioners for Eagle Harbor,' consisting of five (5) Town
-- Commissioners who shall each be elected at-large ... and who shall hold
-- office for a term period of two years." There is NO separately elected
-- Mayor's office: Article II §2, "Election of Chairman of the Town
-- Commissioners," reads "The Town Commissioners shall, at their first
-- meeting after election, elect a Chairman of the Board of Town
-- Commissioners from among its members who shall act as Chairman of the
-- Board ... and the ceremonial Mayor of the Town." This is independently
-- confirmed by the Maryland Manual, which states outright "James S. Jones,
-- Mayor (chosen by Board, 2-year term)" alongside the other four names
-- under a single "BOARD OF COMMISSIONERS ... Elected by Voters to 2-year
-- terms (Aug.)" heading -- i.e. Jones is one of the five elected
-- Commissioners, then separately chosen Chairman-Mayor by his fellow
-- Commissioners, not popularly elected to a distinct Mayor's office.
-- Modeled the same way as Glenarden (#014), the closest existing
-- precedent: a single-seat 'Mayor' office (is_elected=FALSE) filled by
-- internal Board selection, plus a 5-seat 'Board of Town Commissioners —
-- At-Large' office (is_elected=TRUE) holding all 5 directly-elected
-- winners. Jones holds both rows -- his Commissioner seat is
-- how_obtained='elected', his Mayor seat is how_obtained='appointed' --
-- same dual-row pattern as Glenarden's Derek Curtis.
--
-- The Maryland Manual additionally lists each of the other four
-- Commissioners' internal portfolio assignment (License & Permit, Public
-- Safety & Health, Roads, Sanitation) -- these are internal committee
-- liaison titles, not separate charter-created offices (the Charter's
-- Article II describes only the single undifferentiated 5-seat Board), so
-- they are recorded in each politician's bio rather than as a distinct
-- office/seat_type.
--
-- FULL ROSTER CONFIRMED -- NO GAPS: both independent sources agree on all
-- 5 names: James S. Jones (Mayor/Chairman + Commissioner), Alton R.
-- Branson (Sanitation Commissioner), Harold Bryant II (Public Safety &
-- Health Commissioner), Patricia A. Crews (License & Permit Commissioner),
-- and Donzell H. Littlejohn (Roads Commissioner) -- the town's own site
-- spells this last name "Donnie Littlejohn," evidently a nickname/short
-- form of the same "Donzell" given on the Maryland Manual and used as
-- full_name below, not a different-person error.
--
-- ELECTION AND TERM-START DATES -- COMPUTED DIRECTLY FROM CHARTER TEXT,
-- not guessed: Article IV §4, "Time and Place of Elections," quoted
-- directly: "The election for the Town's Board of Commissioners shall be
-- held on the second Saturday in August of each odd-numbered year." 2025 is
-- odd-numbered; the second Saturday in August 2025 is August 9, 2025.
-- Article II §1 states the newly elected Commissioners "take office on the
-- second Saturday in September following their election"; the second
-- Saturday in September 2025 is September 13, 2025 -- used as term_start
-- below for all 5 Commissioner seats and, per Article II §2's "at their
-- first meeting after election" language, for the Mayor/Chairman selection
-- as well.
--
-- DISCREPANCIES CAUGHT: (1) the Charter's own Article II §6 separately
-- describes "the newly-elected Board shall meet ... on the first Saturday
-- in September following its election" (Sept. 6, 2025) to set a regular
-- meeting schedule -- one week earlier than the "second Saturday" take-
-- office date in §1, an apparent internal inconsistency in this
-- old, patchwork-amended charter. September 13, 2025 (§1's explicit
-- take-office rule, arithmetically verified against the 2025 calendar) is
-- used as the operative term_start, since §1 is the provision that
-- specifically governs when a term begins; the discrepancy is disclosed
-- here rather than silently resolved. (2) An initial aggregated WebSearch
-- result claimed officials were "sworn into office" on "Friday, September
-- 12, 2025" -- this is neither of the two Saturday dates the Charter's own
-- formulas produce for 2025 (Sept. 6 or Sept. 13) and September 12, 2025
-- is in fact a Friday, not a Saturday as both charter provisions require;
-- treated as an unreliable secondary-source artifact and NOT used below in
-- favor of the charter-computed September 13, 2025 date.
--
-- is_partisan set FALSE by inference: a full-text search of the extracted
-- charter for "partisan"/"party"/"nonpartisan" turns up only unrelated
-- references (political-contribution restrictions on Town employees, legal
-- "party" meaning a litigant) -- no party-designation mechanism of any kind
-- appears anywhere in the candidate-nomination process (Article IV §6:
-- a petition endorsed by 15 registered voters, no party field), consistent
-- with every other Maryland municipality modeled so far, though not backed
-- by an explicit "nonpartisan" declaration the way Bowie/District Heights'
-- charters are.
--
-- ACCOUNTABILITY: no citizen recall or petition-based removal mechanism
-- was found anywhere in the charter -- the only citizen-petition process in
-- Article II §15 ("Processing Referendums") applies solely to repealing an
-- ordinance, not to removing an officeholder. There IS a real, citable
-- Board-internal removal power, however: Article II §7, "Vacancies in the
-- Board of Town Commissioners," quoted directly, lists four ordinary
-- vacancy grounds (resignation, death, disqualification, failure to
-- qualify within 30 days) plus a fifth catch-all: "(5) any other reason not
-- herein specified upon unanimous vote of all the remaining Board
-- members." This lets the Board create a vacancy in any Commissioner's
-- seat -- and, since the Chairman-Mayor holds that title only by virtue of
-- also being a Commissioner (Article II §2), it necessarily reaches the
-- Mayor too -- for essentially any reason, so long as EVERY other Board
-- member concurs. Modeled below as 'supermajority_council_removal' (the
-- closest available mechanism_type; the charter's actual threshold is
-- unanimity among the remaining members, which is stricter than a bare
-- supermajority, noted explicitly in the description), fanned out to both
-- offices in this jurisdiction (same fan-out pattern as migrations
-- #014/#019), since losing Board membership also ends the Chairmanship.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:eagle_harbor', 'Town of Eagle Harbor', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('19000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:eagle_harbor', 'Mayor', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('19000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:eagle_harbor', 'Board of Town Commissioners — At-Large', 'at_large', 5, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('19000000-0000-4000-8000-000000000101', 'James S. Jones', NULL, '19000000-0000-4000-8000-000000000001', 'Mayor of Eagle Harbor; one of five at-large Town Commissioners elected August 9, 2025, then chosen Chairman of the Board of Town Commissioners and ceremonial Mayor by his fellow Commissioners rather than through a separate direct popular vote for the office. Took office September 13, 2025. Term expires 2027.'),
  ('19000000-0000-4000-8000-000000000102', 'Alton R. Branson', NULL, '19000000-0000-4000-8000-000000000002', 'Town Commissioner, at-large, and Sanitation Commissioner (internal portfolio assignment); elected August 9, 2025, took office September 13, 2025. Term expires 2027.'),
  ('19000000-0000-4000-8000-000000000103', 'Harold Bryant II', NULL, '19000000-0000-4000-8000-000000000002', 'Town Commissioner, at-large, and Public Safety & Health Commissioner (internal portfolio assignment); elected August 9, 2025, took office September 13, 2025. Term expires 2027.'),
  ('19000000-0000-4000-8000-000000000104', 'Patricia A. Crews', NULL, '19000000-0000-4000-8000-000000000002', 'Town Commissioner, at-large, and License & Permit Commissioner (internal portfolio assignment); elected August 9, 2025, took office September 13, 2025. Term expires 2027.'),
  ('19000000-0000-4000-8000-000000000105', 'Donzell H. Littlejohn', NULL, '19000000-0000-4000-8000-000000000002', 'Town Commissioner, at-large, and Roads Commissioner (internal portfolio assignment); also given as "Donnie Littlejohn" on the town''s own website -- same person, nickname variant. Elected August 9, 2025, took office September 13, 2025. Term expires 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000101', '2025-09-13', 'elected'),
  ('19000000-0000-4000-8000-000000000001', '19000000-0000-4000-8000-000000000101', '2025-09-13', 'appointed'),
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000102', '2025-09-13', 'elected'),
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000103', '2025-09-13', 'elected'),
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000104', '2025-09-13', 'elected'),
  ('19000000-0000-4000-8000-000000000002', '19000000-0000-4000-8000-000000000105', '2025-09-13', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:eagle_harbor', id, 'supermajority_council_removal', TRUE,
  'Charter of the Town of Eagle Harbor, Article II, §7(5)',
  NULL,
  'The Board of Town Commissioners may declare any Commissioner''s seat vacant for "any other reason not herein specified" upon the UNANIMOUS vote of all remaining Board members (a stricter threshold than a bare supermajority). Because the Chairman-Mayor holds that title only by virtue of also being a Commissioner (Article II §2), this mechanism reaches the Mayor as well as any Commissioner. No citizen-initiated recall or removal petition exists in the Charter -- the only citizen-petition process (Article II §15) applies solely to referring an ordinance to referendum, not to removing an officeholder.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:eagle_harbor';
