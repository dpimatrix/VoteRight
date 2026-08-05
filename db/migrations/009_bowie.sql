-- City of Bowie, MD: Prince George's County's largest municipality, chosen as
-- the pilot for closing the "unmodeled municipalities" gap found 2026-08-05
-- (the county has 27 incorporated municipalities total -- 10 cities + 17
-- towns per the Maryland Manual and the Prince George's County Municipal
-- Association -- of which only this one is modeled so far). Real
-- officeholders live-verified 2026-08-05 (WebSearch/WebFetch against
-- cityofbowie.org, WTOP, Patch, Ballotpedia, and Nov 2023/Apr 2026/Jun 2026
-- election coverage).
--
-- Government: Council-Manager, nonpartisan, 4-year terms, all 7 seats
-- (Mayor + 2 At-Large + 4 District) elected together every cycle since a
-- 2015 charter change (previously 2-year terms).
--
-- Real mid-cycle turnover found and modeled here, not smoothed over: Mayor
-- Tim Adams (re-elected Nov 7, 2023, sworn in Nov 20, 2023) resigned as
-- Bowie's mayor Feb 2, 2026, after being APPOINTED by the Prince George's
-- County Council (Jan 23, 2026) to fill a County Council District 4
-- vacancy -- Adams is now a sitting COUNTY councilmember, already correctly
-- reflected as such in migration 005 (do not re-add him here as Bowie
-- mayor). His Bowie vacancy triggered a special election (Apr 7, 2026, won
-- by then-District-1 Councilmember Michael Estève), which in turn vacated
-- District 1, filled by a second special election (Jun 30, 2026, won by
-- Zipporah Miller).
--
-- Confidence note: the five Nov-2023 regular-cycle members' term_start is
-- the confirmed real swearing-in date (Nov 20, 2023, Special Council
-- Meeting per city records). Estève's and Miller's term_start use their
-- special-election DATES (Apr 7 / Jun 30, 2026) since no swearing-in date
-- could be independently confirmed for either -- a reasonable estimate
-- pending a firmer source, same honesty convention as Arlington's Maureen
-- Coffey entry in migration 005.
--
-- No accountability_pathways row added: no verified charter recall/removal
-- citation was found for Bowie specifically -- same already-honest gap that
-- exists for Rockville and Gaithersburg today, not fabricated here.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:bowie', 'City of Bowie', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('60000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:bowie', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('60000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:bowie', 'City Council — At-Large', 'at_large', 2, 4, FALSE, TRUE, 'municipal'),
  ('60000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:bowie', 'City Council — District 1', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('60000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:bowie', 'City Council — District 2', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('60000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:md/place:bowie', 'City Council — District 3', 'district', 1, 4, FALSE, TRUE, 'municipal'),
  ('60000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:md/place:bowie', 'City Council — District 4', 'district', 1, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('60000000-0000-4000-8000-000000000101', 'Michael P. Estève', NULL, '60000000-0000-4000-8000-000000000001', 'Mayor of Bowie; won the April 7, 2026 special election after Mayor Tim Adams resigned to join the Prince George''s County Council. Previously District 1 Councilmember (elected Nov 7, 2023).'),
  ('60000000-0000-4000-8000-000000000102', 'Dennis Brady', NULL, '60000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected Nov 7, 2023, sworn in Nov 20, 2023.'),
  ('60000000-0000-4000-8000-000000000103', 'Wanda Rogers', NULL, '60000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected Nov 7, 2023, sworn in Nov 20, 2023.'),
  ('60000000-0000-4000-8000-000000000104', 'Zipporah Miller', NULL, '60000000-0000-4000-8000-000000000003', 'City Council District 1 member; won the June 30, 2026 special election to fill the vacancy left by Michael Estève''s election as Mayor.'),
  ('60000000-0000-4000-8000-000000000105', 'Dufour Woolfley', NULL, '60000000-0000-4000-8000-000000000004', 'City Council District 2 member (Mayor Pro Tem), elected Nov 7, 2023, sworn in Nov 20, 2023.'),
  ('60000000-0000-4000-8000-000000000106', 'Clinton Truesdale, Sr.', NULL, '60000000-0000-4000-8000-000000000005', 'City Council District 3 member, elected Nov 7, 2023, sworn in Nov 20, 2023.'),
  ('60000000-0000-4000-8000-000000000107', 'Roxy Ndebumadu', NULL, '60000000-0000-4000-8000-000000000006', 'City Council District 4 member, re-elected Nov 7, 2023, sworn in Nov 20, 2023.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000101', '2026-04-07', 'elected'),
  ('60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000102', '2023-11-20', 'elected'),
  ('60000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000103', '2023-11-20', 'elected'),
  ('60000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000104', '2026-06-30', 'elected'),
  ('60000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000105', '2023-11-20', 'elected'),
  ('60000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000106', '2023-11-20', 'elected'),
  ('60000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000107', '2023-11-20', 'elected');
