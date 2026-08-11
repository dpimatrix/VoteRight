-- Town of Poolesville, MD: second of Montgomery County's remaining
-- municipalities. Confirmed live against the real Census geocoder (19721
-- Beall St, Poolesville, MD -> Counties layer: Montgomery County 24/031;
-- Incorporated Places layer: "Poolesville town"). level='municipal',
-- parent=Montgomery County's own ocd_id.
--
-- STRUCTURE, GENUINELY DIFFERENT FROM EVERY MONTGOMERY MUNICIPALITY MODELED
-- SO FAR: a pure commission government -- 5 Commissioners, all elected
-- at-large, on STAGGERED 4-year terms (3 seats one cycle, 2 the next). The
-- top position is titled "President" (not Mayor), chosen by the 5
-- Commissioners from among themselves for a 2-year tenure -- same dual-
-- office-row pattern as Falls Church/Greenbelt/Glenarden (Commission seat
-- is_elected=TRUE, President office is_elected=FALSE/appointed). Real,
-- unusually specific finding from the Charter itself (Section 82-3, read
-- via pdftotext after WebFetch returned unparsed binary): Commissioner
-- elections are held AT THE SAME TIME as the biennial November federal
-- Congressional election, not in May like several other small Montgomery
-- towns -- confirmed consistent with the Maryland Manual's own listed
-- term-expiration years (2026 and 2028, both even).
--
-- Real officeholders live-verified 2026-08-11 (WebSearch/WebFetch against
-- poolesvillemd.gov and the Maryland Manual): President James E. Brown and
-- Commissioner Sarah A. Paksima (both elected Nov 2022, term expires 2026);
-- Vice-President Edward A. Reed and Commissioners Bryan R. Bupp and H.
-- Alan Hobbs (all elected Nov 2024, term expires 2028). ESTIMATED, NOT
-- DIRECTLY CONFIRMED term-start dates: neither the Charter nor any source
-- found in this pass gives an exact swearing-in date, only the Charter's
-- general organizational-meeting rule ("on or before the first Monday in
-- the month next succeeding their appointment") -- applied here as the
-- most defensible estimate (first Monday of December following each
-- November election), same disclosed-estimate discipline as Bowie's
-- Estève/Miller dates. President/VP selection dated to the same estimated
-- date as their most recent Commission seating (2024, since that's when
-- the current mix took its current shape).
--
-- ACCOUNTABILITY: a real, GROUNDS-BASED citizen recall exists -- unlike
-- several other jurisdictions' pure up-or-down recalls, Poolesville's
-- Charter requires the petition to allege one of 12 specific enumerated
-- grounds (failure to uphold the oath of office; malfeasance/misfeasance/
-- nonfeasance; felony conviction; moral turpitude; mismanagement of public
-- funds; coercion of Town employees; gross negligence; conduct injurious
-- to the Town's reputation; violating official duty; incapacity) --
-- general policy disagreement or broken promises alone would not qualify.
-- 30% petition threshold, extracted via pdftotext from the Charter.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:poolesville', 'Town of Poolesville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('2a000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:poolesville', 'President', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('2a000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:poolesville', 'Town Commission', 'at_large', 5, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('2a000000-0000-4000-8000-000000000101', 'James E. Brown', NULL, '2a000000-0000-4000-8000-000000000001', 'President of the Town Commission -- chosen by fellow Commissioners. Commissioner, elected Nov 2022, term expires 2026.'),
  ('2a000000-0000-4000-8000-000000000102', 'Edward A. Reed', NULL, '2a000000-0000-4000-8000-000000000002', 'Vice-President -- chosen by fellow Commissioners. Commissioner, elected Nov 2024, term expires 2028.'),
  ('2a000000-0000-4000-8000-000000000103', 'Sarah A. Paksima', NULL, '2a000000-0000-4000-8000-000000000002', 'Commissioner, elected Nov 2022, term expires 2026.'),
  ('2a000000-0000-4000-8000-000000000104', 'Bryan R. Bupp', NULL, '2a000000-0000-4000-8000-000000000002', 'Commissioner, elected Nov 2024, term expires 2028.'),
  ('2a000000-0000-4000-8000-000000000105', 'H. Alan Hobbs', NULL, '2a000000-0000-4000-8000-000000000002', 'Commissioner, elected Nov 2024, term expires 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000101', '2022-12-05', 'elected'),
  ('2a000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000101', '2024-12-02', 'appointed'),
  ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000102', '2024-12-02', 'elected'),
  ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000103', '2022-12-05', 'elected'),
  ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000104', '2024-12-02', 'elected'),
  ('2a000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000105', '2024-12-02', 'elected');

-- Grounds-based citizen recall, Charter Section 115 (recall article). The
-- Charter's own text ("Any Commissioner of Poolesville may be recalled")
-- is scoped to the elected Commissioner seat specifically, not to the
-- internally-selected President title, so this row targets only the Town
-- Commission office -- not a blanket SELECT across both offices.
INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
VALUES ('ocd-division/country:us/state:md/place:poolesville', '2a000000-0000-4000-8000-000000000002', 'municipal_recall', TRUE,
  'Charter of the Town of Poolesville, recall article (§115)',
  '30% of qualified registered voters of the Town',
  'Unlike a pure up-or-down recall, the petition must allege the officeholder violated one of 12 specific enumerated grounds (failure to uphold the oath of office; malfeasance, misfeasance, or nonfeasance in office; felony conviction; conduct involving moral turpitude, fraud, or deceit; mismanagement or misappropriation of public funds; coercing a Town employee; gross negligence or incompetence; conduct injurious to the Town''s reputation; violating an official duty; or incapacity to perform duties) -- general policy disagreement alone does not qualify. If certified, a binding recall election follows within 30-60 days.');
