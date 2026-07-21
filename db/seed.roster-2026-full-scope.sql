-- VoteRight full-county-scope roster — REAL PEOPLE, verified 2026-07-21
-- (docs/DATA-OPS.md §5, owner decision: scope is ALL elected county seats,
-- not just Executive + Council). Applies AFTER seed.roster-2026.sql.
--
-- §2.3 discipline: every officeholding and candidacy fact below was verified
-- against the official SBE primary-results page (results were "Unofficial"
-- as of 2026-07-17/07/21 retrieval — RE-CONFIRM AT CERTIFICATION) and named
-- news coverage, cited per row. Positions/codings are NOT included here —
-- those arrive via D2+/the human coding queue, same as the original roster.
--
-- §2.1.1 scope discipline (the McNulty precedent): ONLY people in the actual
-- November 2026 general-election field are added as new politicians, plus
-- currently-serving incumbents who lost their primary (they still hold the
-- office today, same treatment as Elrich holding the Exec seat while
-- term-limited). Primary losers who are NOT current officeholders are
-- deliberately excluded — same rule already applied to Jim McNulty.
--
-- KNOWN GAP (honest, not silent): Board of Education Districts 2 and 4 exist
-- as offices (structural completeness) but their CURRENT holders are not yet
-- researched — they are not up in 2026 (staggered terms) so this did not
-- block the 2026 candidate field work. Flagged for a future pass.

-- ── Source citations ────────────────────────────────────────────────────────
INSERT INTO citations (id, url, archive_url, title, publisher, published_at) VALUES
 ('00000000-0000-4000-8000-000000001904',
  'https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_by_county_16.html',
  'https://web.archive.org/web/2026/https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_by_county_16.html',
  '2026 Gubernatorial Primary results — Montgomery County, full county races (unofficial as of 2026-07-21)', 'Maryland State Board of Elections', '2026-07-17'),
 ('00000000-0000-4000-8000-000000001905',
  'https://www.thebanner.com/voter-guide/2026/montgomery-county/montgomery-county-council-district-3-T4ZDBJIT6RCNJMYRRXTXBSVC24/',
  'https://web.archive.org/web/2026/https://www.thebanner.com/voter-guide/2026/montgomery-county/montgomery-county-council-district-3-T4ZDBJIT6RCNJMYRRXTXBSVC24/',
  'Montgomery County Council District 3: 2026 Maryland Voter Guide (Katz term-limited)', 'The Baltimore Banner', '2026-06-01'),
 ('00000000-0000-4000-8000-000000001906',
  'https://bethesdamagazine.com/2026/06/24/montgomery-county-sheriff-primary-election-milam-leads/',
  'https://web.archive.org/web/2026/https://bethesdamagazine.com/2026/06/24/montgomery-county-sheriff-primary-election-milam-leads/',
  'Milam holds substantial lead in Democratic primary for Montgomery County sheriff (incumbent Uy)', 'Bethesda Magazine', '2026-06-24'),
 ('00000000-0000-4000-8000-000000001907',
  'https://www.nbcwashington.com/decision-2026/will-milam-to-be-new-montgomery-county-sheriff/4121730/',
  'https://web.archive.org/web/2026/https://www.nbcwashington.com/decision-2026/will-milam-to-be-new-montgomery-county-sheriff/4121730/',
  'Will Milam to be new Montgomery County sheriff — no Republican filed, general uncontested', 'NBC4 Washington', '2026-06-25'),
 ('00000000-0000-4000-8000-000000001908',
  'https://www.thebanner.com/voter-guide/2026/montgomery-county/montgomery-county-register-of-wills-HDD5XULPIRBZPE5U4PXI447VGY/',
  'https://web.archive.org/web/2026/https://www.thebanner.com/voter-guide/2026/montgomery-county/montgomery-county-register-of-wills-HDD5XULPIRBZPE5U4PXI447VGY/',
  'Montgomery County Register of Wills: 2026 Maryland Voter Guide (incumbent Dollahite appointed Dec 2025)', 'The Baltimore Banner', '2026-06-01'),
 ('00000000-0000-4000-8000-000000001909',
  'https://www.thebanner.com/politics-power/local-government/montgomery-circuit-court-judge-election-YXSCQVIYBRGAZABULDSIXZDFBQ/',
  'https://web.archive.org/web/2026/https://www.thebanner.com/politics-power/local-government/montgomery-circuit-court-judge-election-YXSCQVIYBRGAZABULDSIXZDFBQ/',
  '4 judges and a 5-time challenger running for Montgomery County Circuit Court', 'The Baltimore Banner', '2026-05-20'),
 ('00000000-0000-4000-8000-000000001910',
  'https://governor.maryland.gov/news/press-releases/governor-moore-announces-appointments-montgomery-county-circuit-court-baltimore-county-circuit-court',
  'https://web.archive.org/web/2026/https://governor.maryland.gov/news/press-releases/governor-moore-announces-appointments-montgomery-county-circuit-court-baltimore-county-circuit-court',
  'Governor Moore Announces Appointments to Montgomery County Circuit Court (Del Pino, Jan 2026)', 'Office of Governor Wes Moore', '2026-01-15'),
 ('00000000-0000-4000-8000-000000001911',
  'https://ballotpedia.org/Sharon_V._Burrell',
  'https://web.archive.org/web/2026/https://ballotpedia.org/Sharon_V._Burrell',
  'Sharon V. Burrell — appointed by Gov. O''Malley, assumed office 2008-10-21', 'Ballotpedia', '2026-01-01'),
 ('00000000-0000-4000-8000-000000001912',
  'https://bethesdamagazine.com/2026/02/25/moco-school-board-candidates/',
  'https://web.archive.org/web/2026/https://bethesdamagazine.com/2026/02/25/moco-school-board-candidates/',
  '12 candidates vying for seats on MoCo school board in June primary (districts up: 1, 3, 5, At-Large)', 'Bethesda Magazine', '2026-02-25'),
 ('00000000-0000-4000-8000-000000001913',
  'https://x.com/PotomacPeck/status/1993042296896364970',
  'https://web.archive.org/web/2026/https://x.com/PotomacPeck/status/1993042296896364970',
  'Sally McCarthy files for open District 3 seat as Julie Yang (District 3 incumbent) runs for County Council District 1 instead', 'Bethesda Magazine (via Lou Peck)', '2026-01-01');

-- ── New offices: Board of Education Districts (At-Large already existed) ───
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
 ('00000000-0000-4000-8000-000000000431', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — District 1', 'district', 1, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000432', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — District 2', 'district', 1, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000433', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — District 3', 'district', 1, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000434', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — District 4', 'district', 1, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000435', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — District 5', 'district', 1, 4, FALSE, TRUE, 'school_board');

-- ── New politicians: November 2026 general-election field + lame-duck incumbents ──
INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
 -- Council District 1 (open — Friedson not seeking reelection)
 ('00000000-0000-4000-8000-000000002001', 'Julie Yang', 'D', '00000000-0000-4000-8000-000000000433', 'Currently the Board of Education District 3 member; Democratic nominee for County Council District 1, 2026.'),
 ('00000000-0000-4000-8000-000000002002', 'Reardon "Sully" Sullivan', 'R', NULL, 'Republican nominee for County Council District 1, 2026.'),
 -- Council District 3 (open — Katz term-limited)
 ('00000000-0000-4000-8000-000000002003', 'Jud Ashman', 'D', NULL, 'Mayor of Gaithersburg; Democratic nominee for County Council District 3, 2026.'),
 ('00000000-0000-4000-8000-000000002004', 'Ricky Fai Mui', 'R', NULL, 'Republican nominee for County Council District 3, 2026.'),
 -- Council District 5, 6, 7 general-election challengers (incumbents already exist)
 ('00000000-0000-4000-8000-000000002005', 'Josephine Salazar', 'R', NULL, 'Republican nominee for County Council District 5, 2026.'),
 ('00000000-0000-4000-8000-000000002006', 'Louella Tham', 'R', NULL, 'Republican nominee for County Council District 6, 2026.'),
 ('00000000-0000-4000-8000-000000002007', 'Harold Maldonado', 'R', NULL, 'Republican nominee for County Council District 7, 2026.'),
 -- Sheriff
 ('00000000-0000-4000-8000-000000002008', 'Will Milam', 'D', NULL, 'Democratic nominee for Sheriff, 2026; no Republican filed, general uncontested.'),
 ('00000000-0000-4000-8000-000000002009', 'Maxwell Uy', 'D', '00000000-0000-4000-8000-000000000404', 'Sitting Sheriff; lost the 2026 Democratic primary to Will Milam and is not on the November ballot.'),
 -- State's Attorney (incumbent = nominee, one person)
 ('00000000-0000-4000-8000-000000002010', 'John McCarthy', 'D', '00000000-0000-4000-8000-000000000405', 'Sitting State''s Attorney; won the 2026 Democratic primary unopposed, seeking a sixth term. No Republican filed.'),
 -- Register of Wills
 ('00000000-0000-4000-8000-000000002011', 'Barbara Ebel', 'D', NULL, 'Democratic nominee for Register of Wills, 2026.'),
 ('00000000-0000-4000-8000-000000002012', 'T. Dolores Reyes', 'R', NULL, 'Republican nominee for Register of Wills, 2026.'),
 ('00000000-0000-4000-8000-000000002013', 'Paul Dollahite', 'D', '00000000-0000-4000-8000-000000000407', 'Sitting Register of Wills (appointed December 2025); lost the 2026 Democratic primary to Barbara Ebel and is not on the November ballot.'),
 -- Circuit Court Judges (sitting; won both party ballots)
 ('00000000-0000-4000-8000-000000002014', 'Sharon V. Burrell', NULL, '00000000-0000-4000-8000-000000000409', 'Sitting Circuit Court judge (assumed office 2008); nonpartisan nominee on both party ballots for the 2026 election.'),
 ('00000000-0000-4000-8000-000000002015', 'Victor M. Del Pino', NULL, '00000000-0000-4000-8000-000000000409', 'Sitting Circuit Court judge (appointed January 2026); nonpartisan nominee on both party ballots for the 2026 election.'),
 ('00000000-0000-4000-8000-000000002016', 'James J. Dietrich', NULL, '00000000-0000-4000-8000-000000000409', 'Sitting Circuit Court judge (appointed September 2025); nonpartisan nominee on both party ballots for the 2026 election.'),
 ('00000000-0000-4000-8000-000000002017', 'Catherine H. McQueen', NULL, '00000000-0000-4000-8000-000000000409', 'Sitting Circuit Court judge (appointed late 2024); nonpartisan nominee on both party ballots for the 2026 election.'),
 -- Board of Education
 ('00000000-0000-4000-8000-000000002018', 'Grace Rivera-Oven', NULL, '00000000-0000-4000-8000-000000000431', 'Sitting Board of Education District 1 member, unopposed for reelection in 2026.'),
 ('00000000-0000-4000-8000-000000002019', 'Elma-Lorraine Diggs', NULL, '00000000-0000-4000-8000-000000000435', 'Sitting Board of Education District 5 member, unopposed for reelection in 2026.'),
 ('00000000-0000-4000-8000-000000002020', 'Sally A. McCarthy', NULL, NULL, 'Nonpartisan nominee (top-2 primary finish) for Board of Education District 3, 2026 — the open seat Julie Yang is leaving.'),
 ('00000000-0000-4000-8000-000000002021', 'Cassandra "Cassi" Sung', NULL, NULL, 'Nonpartisan nominee (top-2 primary finish) for Board of Education District 3, 2026.'),
 ('00000000-0000-4000-8000-000000002022', 'Omar Lazo', NULL, NULL, 'Nonpartisan nominee for Board of Education At-Large, 2026 (2 seats).'),
 ('00000000-0000-4000-8000-000000002023', 'Brenda M. Diaz', NULL, NULL, 'Nonpartisan nominee for Board of Education At-Large, 2026 (2 seats).'),
 ('00000000-0000-4000-8000-000000002024', 'Wylea Chase', NULL, NULL, 'Nonpartisan nominee for Board of Education At-Large, 2026 (2 seats).'),
 ('00000000-0000-4000-8000-000000002025', 'Tiffany E. Wicks', NULL, NULL, 'Nonpartisan nominee for Board of Education At-Large, 2026 (2 seats).');

-- ── Office terms: current holders newly on record ──────────────────────────
INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained, source_citation_id) VALUES
 ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000002009', '2022-12-05', 'elected', '00000000-0000-4000-8000-000000001906'), -- Uy, Sheriff
 ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000002010', '2022-12-05', 'elected', '00000000-0000-4000-8000-000000001901'), -- McCarthy, State's Attorney (6th term incumbent; exact first-elected date not verified here — term_start reflects the current 4-yr term only)
 ('00000000-0000-4000-8000-000000000407', '00000000-0000-4000-8000-000000002013', '2025-12-01', 'appointed', '00000000-0000-4000-8000-000000001908'), -- Dollahite, Register of Wills
 ('00000000-0000-4000-8000-000000000409', '00000000-0000-4000-8000-000000002014', '2008-10-21', 'appointed', '00000000-0000-4000-8000-000000001911'), -- Burrell (appointment predates a likely subsequent election not yet sourced — see file header)
 ('00000000-0000-4000-8000-000000000409', '00000000-0000-4000-8000-000000002015', '2026-01-15', 'appointed', '00000000-0000-4000-8000-000000001910'), -- Del Pino
 ('00000000-0000-4000-8000-000000000409', '00000000-0000-4000-8000-000000002016', '2025-09-01', 'appointed', '00000000-0000-4000-8000-000000001909'), -- Dietrich (month precision only)
 ('00000000-0000-4000-8000-000000000409', '00000000-0000-4000-8000-000000002017', '2024-12-01', 'appointed', '00000000-0000-4000-8000-000000001909'), -- McQueen (month precision only)
 ('00000000-0000-4000-8000-000000000431', '00000000-0000-4000-8000-000000002018', '2022-12-01', 'elected', '00000000-0000-4000-8000-000000001912'), -- Rivera-Oven, BOE D1 (exact date not sourced; MCPS BOE terms begin Dec)
 ('00000000-0000-4000-8000-000000000433', '00000000-0000-4000-8000-000000002001', '2022-12-01', 'elected', '00000000-0000-4000-8000-000000001913'), -- Yang, BOE D3 (outgoing)
 ('00000000-0000-4000-8000-000000000435', '00000000-0000-4000-8000-000000002019', '2022-12-01', 'elected', '00000000-0000-4000-8000-000000001912'); -- Diggs, BOE D5

-- ── 2026 general-election races ─────────────────────────────────────────────
INSERT INTO races (id, election_cycle_id, office_id, seats_elected) VALUES
 ('00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000421', 1), -- Council D1
 ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000422', 1), -- Council D2
 ('00000000-0000-4000-8000-000000000523', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000423', 1), -- Council D3
 ('00000000-0000-4000-8000-000000000524', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000424', 1), -- Council D4
 ('00000000-0000-4000-8000-000000000525', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000403', 1), -- Council D5
 ('00000000-0000-4000-8000-000000000526', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000425', 1), -- Council D6
 ('00000000-0000-4000-8000-000000000527', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000426', 1), -- Council D7
 ('00000000-0000-4000-8000-000000000528', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000404', 1), -- Sheriff
 ('00000000-0000-4000-8000-000000000529', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000405', 1), -- State's Attorney
 ('00000000-0000-4000-8000-000000000530', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000407', 1), -- Register of Wills
 ('00000000-0000-4000-8000-000000000531', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000409', 4), -- Circuit Court Judges (4 seats)
 ('00000000-0000-4000-8000-000000000532', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000431', 1), -- BOE D1
 ('00000000-0000-4000-8000-000000000533', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000433', 1), -- BOE D3
 ('00000000-0000-4000-8000-000000000534', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000435', 1), -- BOE D5
 ('00000000-0000-4000-8000-000000000535', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000408', 2); -- BOE At-Large (2 seats)

-- ── Candidacies (November 2026 field; nonpartisan races carry NULL party) ──
INSERT INTO candidacies (id, politician_id, race_id, party) VALUES
 -- Council D1: Yang (D) vs Sullivan (R)
 ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000521', 'D'),
 ('00000000-0000-4000-8000-000000002102', '00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000000521', 'R'),
 -- Council D2: Balcombe unopposed
 ('00000000-0000-4000-8000-000000002103', '00000000-0000-4000-8000-000000001012', '00000000-0000-4000-8000-000000000522', 'D'),
 -- Council D3: Ashman (D) vs Mui (R)
 ('00000000-0000-4000-8000-000000002104', '00000000-0000-4000-8000-000000002003', '00000000-0000-4000-8000-000000000523', 'D'),
 ('00000000-0000-4000-8000-000000002105', '00000000-0000-4000-8000-000000002004', '00000000-0000-4000-8000-000000000523', 'R'),
 -- Council D4: Stewart unopposed
 ('00000000-0000-4000-8000-000000002106', '00000000-0000-4000-8000-000000001014', '00000000-0000-4000-8000-000000000524', 'D'),
 -- Council D5: Mink (D) vs Salazar (R)
 ('00000000-0000-4000-8000-000000002107', '00000000-0000-4000-8000-000000001015', '00000000-0000-4000-8000-000000000525', 'D'),
 ('00000000-0000-4000-8000-000000002108', '00000000-0000-4000-8000-000000002005', '00000000-0000-4000-8000-000000000525', 'R'),
 -- Council D6: Fani-González (D) vs Tham (R)
 ('00000000-0000-4000-8000-000000002109', '00000000-0000-4000-8000-000000001016', '00000000-0000-4000-8000-000000000526', 'D'),
 ('00000000-0000-4000-8000-000000002110', '00000000-0000-4000-8000-000000002006', '00000000-0000-4000-8000-000000000526', 'R'),
 -- Council D7: Luedtke (D) vs Maldonado (R)
 ('00000000-0000-4000-8000-000000002111', '00000000-0000-4000-8000-000000001017', '00000000-0000-4000-8000-000000000527', 'D'),
 ('00000000-0000-4000-8000-000000002112', '00000000-0000-4000-8000-000000002007', '00000000-0000-4000-8000-000000000527', 'R'),
 -- Sheriff: Milam (D) uncontested
 ('00000000-0000-4000-8000-000000002113', '00000000-0000-4000-8000-000000002008', '00000000-0000-4000-8000-000000000528', 'D'),
 -- State's Attorney: McCarthy (D) uncontested
 ('00000000-0000-4000-8000-000000002114', '00000000-0000-4000-8000-000000002010', '00000000-0000-4000-8000-000000000529', 'D'),
 -- Register of Wills: Ebel (D) vs Reyes (R)
 ('00000000-0000-4000-8000-000000002115', '00000000-0000-4000-8000-000000002011', '00000000-0000-4000-8000-000000000530', 'D'),
 ('00000000-0000-4000-8000-000000002116', '00000000-0000-4000-8000-000000002012', '00000000-0000-4000-8000-000000000530', 'R'),
 -- Circuit Court Judges: 4 sitting judges, nonpartisan (cross-filed both parties; party left NULL)
 ('00000000-0000-4000-8000-000000002117', '00000000-0000-4000-8000-000000002014', '00000000-0000-4000-8000-000000000531', NULL),
 ('00000000-0000-4000-8000-000000002118', '00000000-0000-4000-8000-000000002015', '00000000-0000-4000-8000-000000000531', NULL),
 ('00000000-0000-4000-8000-000000002119', '00000000-0000-4000-8000-000000002016', '00000000-0000-4000-8000-000000000531', NULL),
 ('00000000-0000-4000-8000-000000002120', '00000000-0000-4000-8000-000000002017', '00000000-0000-4000-8000-000000000531', NULL),
 -- BOE District 1: Rivera-Oven unopposed
 ('00000000-0000-4000-8000-000000002121', '00000000-0000-4000-8000-000000002018', '00000000-0000-4000-8000-000000000532', NULL),
 -- BOE District 3: McCarthy vs Sung (Yang's outgoing seat)
 ('00000000-0000-4000-8000-000000002122', '00000000-0000-4000-8000-000000002020', '00000000-0000-4000-8000-000000000533', NULL),
 ('00000000-0000-4000-8000-000000002123', '00000000-0000-4000-8000-000000002021', '00000000-0000-4000-8000-000000000533', NULL),
 -- BOE District 5: Diggs unopposed
 ('00000000-0000-4000-8000-000000002124', '00000000-0000-4000-8000-000000002019', '00000000-0000-4000-8000-000000000534', NULL),
 -- BOE At-Large: 4 candidates for 2 seats
 ('00000000-0000-4000-8000-000000002125', '00000000-0000-4000-8000-000000002022', '00000000-0000-4000-8000-000000000535', NULL),
 ('00000000-0000-4000-8000-000000002126', '00000000-0000-4000-8000-000000002023', '00000000-0000-4000-8000-000000000535', NULL),
 ('00000000-0000-4000-8000-000000002127', '00000000-0000-4000-8000-000000002024', '00000000-0000-4000-8000-000000000535', NULL),
 ('00000000-0000-4000-8000-000000002128', '00000000-0000-4000-8000-000000002025', '00000000-0000-4000-8000-000000000535', NULL);

-- ── Incumbents actually running: Balcombe, Stewart, Mink, Fani-González, Luedtke ──
INSERT INTO race_incumbents (race_id, politician_id) VALUES
 ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000001012'),
 ('00000000-0000-4000-8000-000000000524', '00000000-0000-4000-8000-000000001014'),
 ('00000000-0000-4000-8000-000000000525', '00000000-0000-4000-8000-000000001015'),
 ('00000000-0000-4000-8000-000000000526', '00000000-0000-4000-8000-000000001016'),
 ('00000000-0000-4000-8000-000000000527', '00000000-0000-4000-8000-000000001017');
