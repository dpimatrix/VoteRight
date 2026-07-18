-- VoteRight D1 roster — REAL PEOPLE, verified 2026-07-18 (docs/DATA-OPS.md D1).
-- Scope (owner decision): County Executive + County Council. §2.3 discipline:
-- every officeholding fact below was verified against the official county
-- roster page and contemporaneous coverage on the date above; the 2026
-- candidate field comes from the SBE primary-results page, which was still
-- labeled "Unofficial" on 2026-07-18 — RE-CONFIRM AT CERTIFICATION before any
-- public promotion. This file contains officeholding and candidacy FACTS
-- only: no positions, no codings, no promises — those arrive via the D2+
-- cited ingestion pipeline and the human coding queue.

-- ── Source citations ────────────────────────────────────────────────────────
INSERT INTO citations (id, url, archive_url, title, publisher, published_at) VALUES
 ('00000000-0000-4000-8000-000000001901',
  'https://www.montgomerycountymd.gov/government/legislative-branch/county-council/councilmembers',
  'https://web.archive.org/web/2026/https://www.montgomerycountymd.gov/government/legislative-branch/county-council/councilmembers',
  'Councilmembers — official roster', 'Montgomery County, MD', '2026-07-18'),
 ('00000000-0000-4000-8000-000000001902',
  'https://bethesdamagazine.com/2025/12/09/former-moco-school-board-member-appointed-to-vacant-at-large-council-seat/',
  'https://web.archive.org/web/2026/https://bethesdamagazine.com/2025/12/09/former-moco-school-board-member-appointed-to-vacant-at-large-council-seat/',
  'Council appoints Shebra Evans to at-large seat vacated by Gabe Albornoz (resigned 2025-12-01)', 'Bethesda Magazine', '2025-12-09'),
 ('00000000-0000-4000-8000-000000001903',
  'https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_by_county_16.html',
  'https://web.archive.org/web/2026/https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_by_county_16.html',
  '2026 Gubernatorial Primary results — Montgomery County (unofficial as of 2026-07-18)', 'Maryland State Board of Elections', '2026-07-17');

-- ── Officeholders (roster verified 2026-07-18) ─────────────────────────────
INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
 ('00000000-0000-4000-8000-000000001001', 'Marc Elrich', 'D', '00000000-0000-4000-8000-000000000401', 'County Executive since December 2018; term-limited for 2026 by the 2024 charter amendment.'),
 ('00000000-0000-4000-8000-000000001002', 'Evan Glass', 'D', '00000000-0000-4000-8000-000000000402', 'At-large councilmember since December 2018.'),
 ('00000000-0000-4000-8000-000000001003', 'Will Jawando', 'D', '00000000-0000-4000-8000-000000000402', 'At-large councilmember since December 2018.'),
 ('00000000-0000-4000-8000-000000001004', 'Laurie-Anne Sayles', 'D', '00000000-0000-4000-8000-000000000402', 'At-large councilmember since December 2022.'),
 ('00000000-0000-4000-8000-000000001005', 'Shebra Evans', 'D', '00000000-0000-4000-8000-000000000402', 'At-large councilmember, appointed December 2025 to the seat vacated by Gabe Albornoz; previously eight years on the Board of Education.'),
 ('00000000-0000-4000-8000-000000001006', 'Gabe Albornoz', 'D', NULL, 'At-large councilmember December 2018 – December 2025; resigned to lead the county Department of Recreation.'),
 ('00000000-0000-4000-8000-000000001011', 'Andrew Friedson', 'D', '00000000-0000-4000-8000-000000000421', 'District 1 councilmember since December 2018.'),
 ('00000000-0000-4000-8000-000000001012', 'Marilyn Balcombe', 'D', '00000000-0000-4000-8000-000000000422', 'District 2 councilmember since December 2022.'),
 ('00000000-0000-4000-8000-000000001013', 'Sidney Katz', 'D', '00000000-0000-4000-8000-000000000423', 'District 3 councilmember; on the Council since 2014.'),
 ('00000000-0000-4000-8000-000000001014', 'Kate Stewart', 'D', '00000000-0000-4000-8000-000000000424', 'District 4 councilmember since December 2022.'),
 ('00000000-0000-4000-8000-000000001015', 'Kristin Mink', 'D', '00000000-0000-4000-8000-000000000403', 'District 5 councilmember since December 2022.'),
 ('00000000-0000-4000-8000-000000001016', 'Natali Fani-González', 'D', '00000000-0000-4000-8000-000000000425', 'District 6 councilmember since December 2022; Council President 2025–26.'),
 ('00000000-0000-4000-8000-000000001017', 'Dawn Luedtke', 'D', '00000000-0000-4000-8000-000000000426', 'District 7 councilmember since December 2022.');

-- 2026 challengers not currently in office (party per SBE primary ballot)
INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
 ('00000000-0000-4000-8000-000000001021', 'Esther Wells', 'R', NULL, 'Republican nominee for County Executive, 2026.'),
 ('00000000-0000-4000-8000-000000001022', 'Scott Evan Goldberg', 'D', NULL, 'Democratic nominee for County Council At-Large, 2026.'),
 ('00000000-0000-4000-8000-000000001023', 'Karla Silvestre', 'D', NULL, 'Democratic nominee for County Council At-Large, 2026.'),
 ('00000000-0000-4000-8000-000000001024', 'Sherily Wells', 'R', NULL, 'Republican nominee for County Council At-Large, 2026.');

-- ── Office terms (source: official roster + appointment coverage) ──────────
INSERT INTO office_terms (office_id, politician_id, term_start, term_end, how_obtained, source_citation_id) VALUES
 -- Executive: Elrich second term (current); first term kept for the record
 ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001001', '2018-12-03', '2022-12-04', 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001001', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 -- At-large
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000001002', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000001003', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000001004', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000001006', '2022-12-05', '2025-12-01', 'elected', '00000000-0000-4000-8000-000000001902'),
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000001005', '2025-12-09', NULL, 'appointed', '00000000-0000-4000-8000-000000001902'),
 -- Districts 1–7
 ('00000000-0000-4000-8000-000000000421', '00000000-0000-4000-8000-000000001011', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000422', '00000000-0000-4000-8000-000000001012', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000423', '00000000-0000-4000-8000-000000001013', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000424', '00000000-0000-4000-8000-000000001014', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000001015', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000425', '00000000-0000-4000-8000-000000001016', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901'),
 ('00000000-0000-4000-8000-000000000426', '00000000-0000-4000-8000-000000001017', '2022-12-05', NULL, 'elected', '00000000-0000-4000-8000-000000001901');

-- ── 2026 general-election candidacies (SBE primary results; UNOFFICIAL as of
--    2026-07-18 — re-confirm at certification). Schema has no citation column
--    on candidacies; source is citation 1903 above. District contests are out
--    of tracked scope until district-level address resolution ships. ─────────
INSERT INTO candidacies (id, politician_id, race_id, party) VALUES
 -- County Executive (open seat)
 ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000501', 'D'),
 ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000001021', '00000000-0000-4000-8000-000000000501', 'R'),
 -- Council At-Large (elects 4)
 ('00000000-0000-4000-8000-000000001111', '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000001112', '00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000001113', '00000000-0000-4000-8000-000000001022', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000001114', '00000000-0000-4000-8000-000000001023', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000001115', '00000000-0000-4000-8000-000000001024', '00000000-0000-4000-8000-000000000502', 'R');

-- Sitting incumbents actually running in each tracked contest
INSERT INTO race_incumbents (race_id, politician_id) VALUES
 ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000001004');
