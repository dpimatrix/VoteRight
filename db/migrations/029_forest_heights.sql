-- Town of Forest Heights, MD: PG "town" tier. Real officeholders
-- live-verified 2026-08-06 against: the town's own forestheightsmd.gov
-- Mayor's Office, Town Council, and Voting/Elections pages; the Maryland
-- Manual's live current page (msa.maryland.gov/msa/mdmanual/37mun/forest/
-- html/f.html, gives every current officeholder with term-expiration year)
-- AND its separate Forest Heights Mayors history page (.../fmayors.html);
-- the Washington Blade's June 21, 2023 news report of Mayor Lilly's special
-- election; Troy Lilly's own 2025 campaign site (troyformayor.org),
-- independently confirming the March 12, 2025 election date; and the
-- actual Charter of the Town of Forest Heights -- read TWO ways after
-- WebFetch reported the Maryland General Assembly's official PDF reprint
-- (2024) as unparseable binary: (1) `pdftotext -layout` on that saved PDF,
-- and (2) the town's current codified charter on eCode360 (fetched via
-- `curl -A "Mozilla/5.0" ...` after WebFetch got HTTP 403), Chapter 33,
-- read section-by-section in full.
--
-- DISCREPANCY CAUGHT BETWEEN THE TWO CHARTER SOURCES: the Maryland General
-- Assembly's own PDF reprint ("1967 Supplement to the Public Local Laws...
-- 1963 Edition, as amended, Reprinted November 2024") is STALE relative to
-- the town's own current eCode360 codification: the MGA PDF's Section
-- 33-32/33-33 still show Mayor and Council elections held in MAY, and it
-- contains no recall provision at all. eCode360's current text shows both
-- were amended: elections moved to the second Wednesday of MARCH starting
-- 2007 (Ch. Res. No. 23/24, 3-9-2007), and a real recall section (33-94)
-- exists that is entirely absent from the MGA reprint. eCode360, being the
-- town's own actively maintained current code, is treated as authoritative
-- here; every provision cited below not marked "MGA PDF only" comes from
-- eCode360's current text.
--
-- GOVERNMENT STRUCTURE -- CONFIRMED DIRECTLY FROM CHARTER TEXT: Section
-- 33-3 ("Number; selection; term"): "All legislative powers of the Town
-- shall be vested in a Council consisting of the Mayor and six Councilmen."
-- Section 33-30 divides the Town into three wards. Section 33-33(A)/(B)
-- (as amended by Res. No. 24, 3-9-2007 and Res. No. 03-12, 10-1-2012)
-- establishes a GENUINE PER-SEAT STAGGER, not a single slate: "on the
-- second Wednesday of March in 2007 and every two years thereafter, one
-- person from each Ward shall be elected ... for a two year term" (odd-year
-- cycle: 2007, 2009, ... 2025, 2027) and, separately, "on the second
-- Wednesday of March in 2008 and every two years thereafter, one person
-- from each Ward shall be elected ... for a two year term" (even-year
-- cycle: 2008, 2010, ... 2026, 2028) -- i.e. each Ward elects one seat in
-- odd years and a second, independent seat in even years, both two-year
-- terms. Section 33-32 (as amended): the Mayor is separately elected
-- at-large, also a two-year term, on the same odd-year cycle as the
-- odd-cycle Council seats. Both Section 33-3 and Section 33-15 also state a
-- 12-CONSECUTIVE-YEAR term limit on any single elective office under this
-- Charter -- not modeled in this schema (no term-limit column) but noted
-- here as a real structural fact.
--
-- CURRENT ROSTER -- cross-checked and in full agreement between the town's
-- own Town-Council page and the Maryland Manual's live current page on all
-- 6 Council names, their Ward assignments, and (from the Maryland Manual)
-- each seat's term-expiration year: Ward 1 -- Jamilah C. McDonald (expires
-- 2027) and Shaneese Little (expires 2028); Ward 2 -- Theresa Brownson
-- (expires 2027) and Jonathon W. Kennedy II (expires 2028); Ward 3 --
-- Taunya L. Hines (expires 2027) and Paula R. Noble (expires 2028). Given
-- the confirmed 2-year term length and the confirmed odd/even-cycle stagger
-- above, a seat expiring in 2027 was necessarily won in the March 12, 2025
-- election, and a seat expiring in 2028 was necessarily won in the March
-- 11, 2026 election (both dates computed below, not sourced as an explicit
-- per-seat election date for each Councilmember individually).
--
-- MINOR DISCREPANCY, DELIBERATELY NOT RESOLVED BY GUESSING: the town's own
-- Town-Council page names Jamilah C. McDonald "Council President," while
-- the Maryland Manual's live current page instead names Paula R. Noble
-- "President." Section 33-3 read in full does not itself state the
-- President's selection method or term in the portion extracted, but the
-- Maryland Manual's page separately notes the presidency is chosen by the
-- Council each March and serves a one-year term -- consistent with McDonald
-- holding it for the 2025-26 Council year (seated in the March 2025
-- election) and Noble for the 2026-27 Council year (after the March 2026
-- election), i.e. likely two different snapshots in time rather than a
-- factual conflict. No "Council President" is asserted for any individual
-- politician below to avoid guessing which snapshot is current.
--
-- TERM-START DATES -- COMPUTED DIRECTLY FROM CHARTER TEXT, not guessed:
-- Section 33-3 (Council) and Section 33-15 (Mayor) both state office is
-- taken "on the first Wednesday following the election." The second
-- Wednesday of March 2025 is March 12, 2025 (independently confirmed by
-- Troy Lilly's own 2025 campaign site, which lists "March 12, 2025" as the
-- voting date); the first Wednesday following that Wednesday is one week
-- later, March 19, 2025 -- used as term_start for the Mayor and the three
-- odd-cycle Council seats. The second Wednesday of March 2026 is March 11,
-- 2026 (arithmetically verified against the 2026 calendar); the first
-- Wednesday following is March 18, 2026 -- used as term_start for the three
-- even-cycle Council seats. Today's verification date (2026-08-06) is after
-- both dates, so both elections have already occurred and the full current
-- roster from the Maryland Manual's live page reflects both.
--
-- MAYOR LILLY'S PATH TO OFFICE (from the Washington Blade and the Maryland
-- Manual's Forest Heights Mayors history page, cross-checked and in
-- agreement): predecessor Habeeb-Ullah Muhammad died in office Aug. 15,
-- 2021; Calvin Washington won the special election to succeed him Oct. 13,
-- 2021; Washington resigned May 1, 2023, whereupon Council President Troy
-- Barrington Lilly became acting mayor; Lilly then won the special election
-- to complete the term outright on June 20, 2023 (138 votes to Remia
-- Hamilton's 9, per the Washington Blade). The row below models only his
-- CURRENT term, won in the March 12, 2025 regular election (Maryland
-- Manual: "term expires 2027," consistent with a 2-year term from a 2025
-- win), not the 2023 special election.
--
-- is_partisan set FALSE, DIRECTLY CONFIRMED (not inferred): Charter Section
-- 33-34(a), "Conduct of elections -- Non-partisan," quoted directly: "All
-- municipal elections shall be conducted on a non-partisan basis, and no
-- ballot shall carry any party affiliation." Independently, the town's own
-- Voting/Elections page states outright: "Forest Heights elections are
-- nonpartisan."
--
-- ACCOUNTABILITY: a real, citable recall provision exists -- Charter
-- Section 33-94, "Recall of Elected Officials" (present in the town's
-- current eCode360 code; absent from the MGA's November 2024 PDF reprint,
-- see discrepancy note above), quoted directly: "At any time that twenty
-- per centum (20%) of the qualified registered voters submit a petition
-- for a recall vote on the Mayor, and twenty per centum (20%) of qualified
-- voters of the Ward submit a petition to recall the elected official of
-- that Ward, ... the Mayor[] and Council shall, within thirty (30) days of
-- the date the petitions are submitted, validate in open session that the
-- signors are qualified registered voters ... and shall ... schedule by
-- Resolution, a special election on the recall petition, all pursuant to
-- Article 23A of the Annotated Code of Maryland." Modeled as one
-- accountability_pathways row per office (Mayor + all 3 Wards), same
-- fan-out pattern as migrations #014/#019/#027.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:forest_heights', 'Town of Forest Heights', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('1b000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:forest_heights', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('1b000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:forest_heights', 'Town Council — Ward 1', 'district', 2, 2, FALSE, TRUE, 'municipal'),
  ('1b000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:forest_heights', 'Town Council — Ward 2', 'district', 2, 2, FALSE, TRUE, 'municipal'),
  ('1b000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:forest_heights', 'Town Council — Ward 3', 'district', 2, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('1b000000-0000-4000-8000-000000000101', 'Troy Barrington Lilly', NULL, '1b000000-0000-4000-8000-000000000001', 'Mayor of Forest Heights. Became acting mayor May 1, 2023 as Council President upon predecessor Calvin Washington''s resignation, then won the June 20, 2023 special election outright (138 votes to Remia Hamilton''s 9) to complete the term. Won his current, full term in the March 12, 2025 regular election. Term expires 2027.'),
  ('1b000000-0000-4000-8000-000000000102', 'Jamilah C. McDonald', NULL, '1b000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected March 12, 2025 on Ward 1''s odd-year seat cycle. Term expires 2027.'),
  ('1b000000-0000-4000-8000-000000000103', 'Shaneese Little', NULL, '1b000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected March 11, 2026 on Ward 1''s even-year seat cycle. Term expires 2028.'),
  ('1b000000-0000-4000-8000-000000000104', 'Theresa Brownson', NULL, '1b000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected March 12, 2025 on Ward 2''s odd-year seat cycle. Term expires 2027.'),
  ('1b000000-0000-4000-8000-000000000105', 'Jonathon W. Kennedy II', NULL, '1b000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected March 11, 2026 on Ward 2''s even-year seat cycle. Term expires 2028.'),
  ('1b000000-0000-4000-8000-000000000106', 'Taunya L. Hines', NULL, '1b000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; elected March 12, 2025 on Ward 3''s odd-year seat cycle. Term expires 2027.'),
  ('1b000000-0000-4000-8000-000000000107', 'Paula R. Noble', NULL, '1b000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; elected March 11, 2026 on Ward 3''s even-year seat cycle. Term expires 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('1b000000-0000-4000-8000-000000000001', '1b000000-0000-4000-8000-000000000101', '2025-03-19', 'elected'),
  ('1b000000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000102', '2025-03-19', 'elected'),
  ('1b000000-0000-4000-8000-000000000002', '1b000000-0000-4000-8000-000000000103', '2026-03-18', 'elected'),
  ('1b000000-0000-4000-8000-000000000003', '1b000000-0000-4000-8000-000000000104', '2025-03-19', 'elected'),
  ('1b000000-0000-4000-8000-000000000003', '1b000000-0000-4000-8000-000000000105', '2026-03-18', 'elected'),
  ('1b000000-0000-4000-8000-000000000004', '1b000000-0000-4000-8000-000000000106', '2025-03-19', 'elected'),
  ('1b000000-0000-4000-8000-000000000004', '1b000000-0000-4000-8000-000000000107', '2026-03-18', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:forest_heights', id, 'municipal_recall', TRUE,
  'Charter of the Town of Forest Heights, Section 33-94 (Recall of Elected Officials)',
  '20% of the Town''s qualified registered voters to recall the Mayor; 20% of qualified registered voters of a Councilmember''s Ward to recall that Councilmember',
  'A petition signed by the required threshold, submitted to the Mayor and Council (in person or by certified mail), triggers signature validation in open session within 30 days, followed by a special recall election scheduled by Resolution at that or the next legislative meeting, all pursuant to Article 23A of the Annotated Code of Maryland. This section is present in the town''s current eCode360 codification but is absent from the Maryland General Assembly''s November 2024 PDF charter reprint, which appears not to have incorporated it -- see discrepancy note in this migration''s header comment.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:forest_heights';
