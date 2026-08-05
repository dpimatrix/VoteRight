-- City of Glenarden, MD: Prince George's sixth municipality modeled (after
-- Bowie #009, College Park #010, Hyattsville #011, Laurel #012, Greenbelt
-- #015). Real officeholders live-verified 2026-08-05 (WebSearch/WebFetch
-- against cityofglenarden.org's own homepage leadership listing, its 2025
-- Election Results page, and its own "City on the Move" July-September 2025
-- official newsletter -- which includes a dated June 16, 2025 swearing-in
-- article naming all seven officeholders -- cross-checked against the
-- Maryland Manual (msa.maryland.gov), the Maryland General Assembly's own
-- charter reprint at mgaleg.maryland.gov, and DC News Now local coverage of
-- the charter fight.
--
-- GOVERNMENT STRUCTURE JUST CHANGED -- VERIFIED ACROSS SOURCES, NOT
-- ASSUMED: the Nov-2024-reprinted charter PDF at mgaleg.maryland.gov (read
-- in full) still describes the OLD structure -- 3 single-member wards + 4
-- at-large Councilmembers + a directly-elected Mayor (Charter §401, §707)
-- -- because that reprint predates a charter amendment. Charter Amendment
-- Resolution CR-01-2025, passed by the outgoing council Oct 15, 2024,
-- eliminated wards entirely and made the Mayor no longer a directly-elected
-- office: all seven Councilmembers are now elected at-large citywide, and
-- the Council chooses one of its own seven members as Mayor (and another
-- as Mayor Pro Tem) after the election. This is independently confirmed by
-- FOUR separate current sources that all agree with each other: (1) the
-- city's own homepage leadership listing (7 named individuals, all
-- "At-Large", no wards mentioned); (2) the city's own 2025 Election Results
-- page (7 winners, at-large, no ward listed); (3) the Maryland Manual's
-- Glenarden government page, which states outright "Mayor (chosen by
-- Council in June)... At Large" for all 7 seats, "Terms expire 2029"; and
-- (4) DC News Now's coverage of the preceding "power struggle" over the
-- reform. Modeled the same way as Greenbelt (#015), the closest existing
-- precedent: a 'City Council — At-Large' office (seat_count=7,
-- is_elected=TRUE) holds all 7 directly-elected winners; a separate
-- single-seat 'Mayor' office (is_elected=FALSE) is filled by internal
-- council selection, so Curtis's Mayor office_terms row uses
-- how_obtained='appointed', not 'elected', while his Council seat row
-- (he is one of the 7 winners) uses 'elected' -- he holds both rows, one
-- per office, same dual-row pattern as Greenbelt's Emmett Jordan.
--
-- CAUGHT DISCREPANCY: the city's own July-September 2025 newsletter is
-- internally inconsistent -- its front-page "Summer Message" article is
-- signed "Mayor Dr. Cashenna A. Cross" and describes her legislative
-- advocacy "for the next four years," even though the SAME newsletter's
-- cover masthead and its own dated June 16, 2025 swearing-in-ceremony
-- article both list Derek D. Curtis, II as Mayor and Cross only as an
-- at-large Councilwoman. Treated as a stale/unedited leftover byline (Cross
-- was the outgoing Mayor 2021-2025 under the old charter and evidently
-- wrote or reused a template letter), not evidence she retained the office
-- -- outweighed by the cover page, the swearing-in article, the city
-- homepage, and the Maryland Manual, which all agree Curtis is Mayor.
--
-- FULL ROSTER CONFIRMED -- NO GAPS: all 7 seats came up in the single May
-- 5, 2025 at-large election (no staggering -- the whole council turns over
-- together every 4 years per Charter §301(a)/§706), so unlike Laurel
-- (#012) there is no "seat didn't come up this cycle" problem. The city's
-- own dated swearing-in article (June 16, 2025) names all 7 officeholders
-- by name and title: Derek D. Curtis, II (Mayor), Angela D. Ferguson
-- (Mayor Pro Tem), Cashenna A. Cross, Maurice A. Hairston, James A.
-- Herring, Robin Jones (given as "Robin F. Jones" on the Maryland Manual
-- and city homepage -- same person, minor middle-initial variant, not a
-- different-person error), and Donjuan L. Williams.
--
-- TERM-START DATE: the city's own newsletter directly states the 2025-2029
-- City Council's official Swearing-In Ceremony was held Monday, June 16,
-- 2025, and its own bulleted list from that ceremony already shows Curtis
-- titled "Mayor" and Ferguson titled "Mayor Pro Tem" -- so both the Council
-- and Mayor selections are dated here to that same June 16, 2025 event
-- (the Maryland Manual's less specific "chosen by Council in June" is
-- consistent with this).
--
-- PARTISANSHIP -- DIRECTLY CONFIRMED, not inferred: Charter §708 states
-- outright that candidates are listed "in alphabetical order by office
-- with no party designation of any kind."
--
-- ACCOUNTABILITY: unlike Bowie/College Park/Hyattsville/Laurel/Greenbelt,
-- a clearly citable CITIZEN recall provision exists here -- Charter
-- §713(c): a petition signed by 25% of the City's registered voters
-- triggers Board of Elections verification and, if authenticated, a
-- binding special recall election within 60 days; a recall-majority vote
-- immediately vacates the office. (The charter's own text still splits the
-- signature threshold into an at-large branch and a now-obsolete ward
-- branch, left over from the pre-2025 mixed system; since all offices are
-- now at-large, only the citywide-25% branch currently applies.) Charter
-- §713(d) additionally allows the Council itself, by a 5/7 vote, to
-- declare the Mayor's or a Councilmember's seat vacant after 90
-- consecutive days of failing to perform the duties of office -- a narrow,
-- non-performance-only ground, not general misconduct. Both are modeled
-- below as real, distinct, separately-citable mechanisms.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:glenarden', 'City of Glenarden', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:glenarden', 'Mayor', 'single', 1, 4, FALSE, FALSE, 'municipal'),
  ('b0000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:glenarden', 'City Council — At-Large', 'at_large', 7, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('b0000000-0000-4000-8000-000000000101', 'Derek D. Curtis II', NULL, 'b0000000-0000-4000-8000-000000000001', 'Mayor of Glenarden; one of seven at-large Councilmembers elected May 5, 2025 (the city''s first election under Charter Amendment Resolution CR-01-2025, which eliminated wards), sworn in June 16, 2025, then chosen Mayor by his fellow councilmembers rather than through a separate direct popular vote for the office.'),
  ('b0000000-0000-4000-8000-000000000102', 'Angela D. Ferguson', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member; chosen Mayor Pro Tem by her fellow councilmembers. Elected to an at-large Council seat May 5, 2025, sworn in June 16, 2025.'),
  ('b0000000-0000-4000-8000-000000000103', 'Cashenna A. Cross', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member; served as Glenarden''s directly-elected Mayor 2021-2025 under the prior charter, then won one of the seven newly at-large Council seats May 5, 2025 after wards and direct mayoral election were eliminated. Sworn in June 16, 2025.'),
  ('b0000000-0000-4000-8000-000000000104', 'Maurice A. Hairston', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected May 5, 2025, sworn in June 16, 2025.'),
  ('b0000000-0000-4000-8000-000000000105', 'James A. Herring', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected May 5, 2025, sworn in June 16, 2025.'),
  ('b0000000-0000-4000-8000-000000000106', 'Robin F. Jones', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected May 5, 2025, sworn in June 16, 2025.'),
  ('b0000000-0000-4000-8000-000000000107', 'Donjuan L. Williams', NULL, 'b0000000-0000-4000-8000-000000000002', 'City Council At-Large member, elected May 5, 2025, sworn in June 16, 2025.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000101', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000101', '2025-06-16', 'appointed'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000102', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000103', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000104', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000105', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000106', '2025-06-16', 'elected'),
  ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000107', '2025-06-16', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:glenarden', id, 'municipal_recall', TRUE,
  'City of Glenarden Charter §713(c)',
  '25% of the City''s registered voters (all offices are now elected at-large, per Resolution CR-01-2025, so the charter''s citywide-25% branch applies; its separate ward-based branch is now obsolete)',
  'A petition signed by at least 25% of the City''s registered voters, presented to the Council, is referred to the Board of Elections for signature verification. If authenticated, the Council must set a binding special recall election within 60 days. If a majority of votes cast favor recall, the office is declared vacant immediately. Applies to the Mayor and any Councilmember.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:glenarden';

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:glenarden', id, 'supermajority_council_removal', TRUE,
  'City of Glenarden Charter §713(d)',
  NULL,
  'If the Mayor or a Councilmember fails to exercise the duties of office for 90 consecutive days, the Council may, by a 5/7 vote of its membership, adopt a resolution declaring that seat vacant. Narrow, non-performance-only ground -- does not cover general misconduct, policy disagreement, or broken campaign promises.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:glenarden';
