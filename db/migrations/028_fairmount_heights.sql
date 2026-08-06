-- Town of Fairmount Heights, MD: PG "town" tier. Real officeholders and
-- structure live-verified 2026-08-05/06 against: the town's own
-- fairmountheightsmd.gov site (its "Mayor and Town Council" page at
-- /154/Elected-Officials -- the site's ONLY government-nav link, so treated
-- as its canonical current roster, not a random subpage; its "May 2026
-- Election Results" table on that same page; and its own homepage Mayor's
-- message); the Maryland Manual (msa.maryland.gov, including its dedicated
-- Mayors-of-Fairmount-Heights chronology page); and the actual Charter of
-- the Town of Fairmount Heights (Maryland General Assembly's own PDF
-- reprint at mgaleg.maryland.gov, extracted via pdftotext after WebFetch
-- could not parse the binary PDF directly -- Articles I, III, IV, VI, and
-- the charter's own end-of-document Notes section all read in full).
--
-- CAUGHT A REAL STALE-TEXT DISCREPANCY IN THE CHARTER ITSELF, RESOLVED BY
-- THE CHARTER'S OWN NOTES: Charter Sections 1-4, 1-14, and 1-29, read
-- verbatim, all still say Councilmembers and the Mayor "hold office for a
-- term of two (2) years." But the Maryland Manual's Mayors-of-Fairmount-
-- Heights page explicitly documents a transition to 4-year terms starting
-- with the 2019 election ("Elected by Voters to 4-year terms: 2019-2023
-- Lillie Thompson Martin, 2023- Akiaba A. Stewart"), directly
-- contradicting the 2-year figure in the operative
-- section text. The charter document's OWN end-of-document Notes section
-- resolves this: Note (2), attached to Section 1-4, states verbatim:
-- "Resolution FHR 02-18, effective May 24, 2018, altered the term of
-- office for the Mayor and Town Council from a two year term to a four
-- year term. However, the resolution failed to amend the language of
-- Section 1-4 of this Charter. Therefore the resolution is noted here for
-- reference." So the 4-year figure is correct and is a real, adopted,
-- currently-effective amendment (Resolution FHR 02-18) -- the charter's
-- Article III/IV/VI section text simply was never textually conformed to
-- it, a legislative-drafting gap the charter itself flags. term_length_years
-- is set to 4 below, sourced to Resolution FHR 02-18 (effective 5/24/2018),
-- not to the stale "two (2) years" language still printed in Sections 1-4/
-- 1-14/1-29.
--
-- GOVERNMENT STRUCTURE -- directly confirmed from the Charter: Section 1-4,
-- "Town Council consisting of six (6) Councilmembers and a Mayor." The
-- Mayor IS a separately, directly-elected office (Article IV, Section 1-14:
-- "The Mayor shall be elected as hereinafter provided"; Section 1-29: "the
-- voters shall elect one (1) person as Mayor") -- not a council-selects-
-- mayor model like Glenarden (#014). The Mayor additionally sits as
-- Chairman of the Council itself (Section 1-9) and votes on Council
-- business, but that is a role layered onto a directly-elected office, not
-- the source of the office. All 7 seats (Mayor + 6 Council) are elected
-- TOWN-WIDE at-large -- the Charter never mentions wards or districts
-- anywhere in Articles III, IV, or VI. Modeled as two offices: a single
-- 'Mayor' seat and one 'Town Council' at-large office with seat_count = 6,
-- same pattern as Glenarden's (#014) single at-large multi-seat Council
-- office.
--
-- STAGGERING -- directly confirmed from Charter Section 1-29 ("On the
-- first Monday of May in every year, the qualified voters of the Town
-- shall elect three (3) persons as Councilmembers ... and in every
-- odd-numbered year the voters shall elect one (1) person as Mayor"): the
-- 6 Council seats split into two groups of 3, one group up in odd years
-- together with the Mayor, the other group up in even years, with annual
-- town elections (not city-wide elections held only every 4 years) filling
-- whichever group is due that year. This 2-year-term-era election-day
-- mechanic was not touched by Resolution FHR 02-18 (which changed only
-- term LENGTH, not the annual election-day/grouping structure), and it is
-- independently corroborated by the town's own current roster: Mayor
-- Stewart, Kiristan M. Leftwich, Gilmore Oscar, and Camisha A. St. John
-- were all elected together in 2023 (odd year, "Class A"), while Raykisha
-- E. Barnhardt, Jacqueline Wood Dodson, and Briana White were elected
-- together in 2022 (even year, "Class B") -- exactly a 3+Mayor / 3 split.
--
-- TERM-START DATES: not independently confirmed by a dated news article;
-- estimated as the first Monday of May of each election year per Charter
-- Section 1-29's still-current election-day rule (2023-05-01 for the Class
-- A 2023 group; 2026-05-04 for the confirmed Class B 2026 winner), same
-- disclosed-estimate convention used for Bowie (#009) and Cheverly (#019).
--
-- HONEST GAP -- ONLY 5 OF 7 SEATS CONFIRMED, NOT GUESSED: the Class B
-- 4-year terms (Barnhardt, Dodson, White -- all elected 2022) expired with
-- the town's May 2026 election. The town's own dated "May 2026 Election
-- Results" table (on its canonical /154/Elected-Officials page) lists only
-- ONE Councilmember-candidate result: "Patricia Waiters -- 14 votes" -- and
-- that same page's "Current Leadership Listed" section names only 4
-- people total (Mayor Stewart, Vice-Chairman Camisha A. St. John, Council
-- Member Gilmore Oscar, Council Member Patricia Waiters), not 7. Kiristan
-- M. Leftwich (Class A, elected 2023, not up for election in 2026) is
-- STILL modeled as a current officeholder below despite her absence from
-- that 4-name list -- her seat has no election event that would explain a
-- turnover, the Maryland Manual (which this series treats as especially
-- reliable for current term data) independently lists her with an
-- unexpired term, and the town's roster page shows other signs of being a
-- hand-curated highlight list rather than an exhaustive directory (it
-- omits term dates and any ward/class organization entirely). By contrast,
-- the OTHER TWO Class B seats (previously Barnhardt and Dodson/White) have
-- no confirmed current holder at all: their term genuinely lapsed in the
-- documented May 2026 election, no second or third Class-B winner appears
-- anywhere in the town's own posted results, and guessing that either
-- woman was simply re-elected unopposed (as the certified Cheverly and
-- Edmonston documents directly showed for their own unopposed winners)
-- would not be supported by any actual result record here. Per the
-- honest-gap convention used repeatedly in this series (e.g. #012 Laurel),
-- the Town Council office below is modeled with its real seat_count = 6,
-- but only 4 Council politicians (plus the Mayor) are inserted; 2 Council
-- seats are left with no current-officeholder row rather than a fabricated
-- name.
--
-- PARTISANSHIP -- DIRECTLY CONFIRMED, not inferred: Charter Section 1-30
-- states outright that ballots "shall show the name of each candidate
-- nominated for elective office ... arranged in alphabetical order by
-- office with no party designation of any kind."
--
-- ACCOUNTABILITY -- a real, detailed, citable recall provision exists:
-- Charter Section 1-29-A, "Recall Election for Mayor and Town Council
-- Members" (added by Res. No. 96-12, 2-6-97), read in full and quoted
-- below.
--
-- Population per the 2020 census: 1,528. Incorporated 1935, the second
-- oldest African-American-majority municipality in Prince George's County
-- (per the Maryland Manual).

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:fairmount_heights', 'Town of Fairmount Heights', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('1a000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:fairmount_heights', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('1a000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:fairmount_heights', 'Town Council', 'at_large', 6, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('1a000000-0000-4000-8000-000000000101', 'Akiaba A. Stewart', NULL, '1a000000-0000-4000-8000-000000000001', 'Mayor of Fairmount Heights and Chairman of the Town Council (Charter Section 1-9 makes the directly-elected Mayor the Council''s Chairman); elected town-wide in the 2023 town election. Term expires 2027.'),
  ('1a000000-0000-4000-8000-000000000102', 'Kiristan M. Leftwich', NULL, '1a000000-0000-4000-8000-000000000002', 'Town Council member, elected town-wide in the 2023 town election alongside Mayor Stewart. Term expires 2027.'),
  ('1a000000-0000-4000-8000-000000000103', 'Gilmore Oscar', NULL, '1a000000-0000-4000-8000-000000000002', 'Town Council member, elected town-wide in the 2023 town election alongside Mayor Stewart. Term expires 2027.'),
  ('1a000000-0000-4000-8000-000000000104', 'Camisha A. St. John', NULL, '1a000000-0000-4000-8000-000000000002', 'Town Council member and current Vice-Chairman of the Council; elected town-wide in the 2023 town election alongside Mayor Stewart. Term expires 2027.'),
  ('1a000000-0000-4000-8000-000000000105', 'Patricia Waiters', NULL, '1a000000-0000-4000-8000-000000000002', 'Town Council member; won the town''s May 2026 election with 14 votes, per the town''s own posted results. Likely the same Patricia M. Waiters who previously served as Mayor of Fairmount Heights 2015-2017 (per the Maryland Manual''s mayoral chronology), though this bio does not assert that identification as independently re-confirmed for this 2026 win. Term expires 2030.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('1a000000-0000-4000-8000-000000000001', '1a000000-0000-4000-8000-000000000101', '2023-05-01', 'elected'),
  ('1a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000102', '2023-05-01', 'elected'),
  ('1a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000103', '2023-05-01', 'elected'),
  ('1a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000104', '2023-05-01', 'elected'),
  ('1a000000-0000-4000-8000-000000000002', '1a000000-0000-4000-8000-000000000105', '2026-05-04', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:fairmount_heights', id, 'municipal_recall', TRUE,
  'Charter of the Town of Fairmount Heights, Section 1-29-A (Recall Election for Mayor and Town Council Members; added by Res. No. 96-12, 2-6-97)',
  '20% of the voters registered to vote in Town elections (a different percentage may be set by ordinance); a second or further recall petition against the same person requires 35%',
  'A petition addressed to the Council and filed with the Town Clerk and Town Election Supervisor, signed by the required threshold, must state one or more of five specific grounds: failure to uphold the oath of office, malfeasance, misfeasance, nonfeasance, or not attending 3 consecutive Town Meetings. If the Town Election Supervisor certifies the petition sufficient and the officer does not resign within 5 days, the Council must order a binding recall election within 30-45 days (or, at the Council''s discretion, combine it with another municipal election occurring within 90 days). A recalled officer''s term ends immediately upon certification of the recall result, and a person removed by recall (or who resigns while recall proceedings are pending) may not be appointed to any elective Town office for 2 years. Applies to the Mayor and any Councilmember.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:fairmount_heights';
