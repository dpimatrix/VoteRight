-- Village of North Chevy Chase, MD: one of six real, separate, adjacent
-- Chevy-Chase-named municipalities in Montgomery County (Town of Chevy
-- Chase, Chevy Chase View, Chevy Chase Village, Village of Chevy Chase
-- Section 3, Village of Chevy Chase Section 5, North Chevy Chase -- each
-- with its own charter and elected officials, researched as separate
-- migrations). Confirmed live against the real Census geocoder (8905
-- Montgomery Ave, Chevy Chase, MD 20815 -- a Village-issued building
-- permit address per Council minutes -> Counties layer: Montgomery County
-- 24/031; Incorporated Places layer: "North Chevy Chase village").
-- level='municipal', parent=Montgomery County's own ocd_id.
--
-- Structure: an elected 5-member Village Council, at-large, 2-year terms,
-- elected at the Village's Annual Meeting each May, staggered 2 seats in
-- odd years / 3 seats in even years (confirmed directly from the
-- Village's own brochure, northchevychase.gov). No separate Mayor -- the
-- Council chooses one of its own as Chair, and separately a Vice-Chair,
-- from among itself; the Maryland Manual states both are "chosen by
-- Council in May" for 1-year terms (Secretary and Treasurer are also
-- internal sub-titles, modeled here as bio text only, same convention as
-- Martin's Additions -- only the top leader, Chair, gets its own office
-- row).
--
-- Real officeholders live-verified 2026-08-11 (Village's own site
-- northchevychase.gov -- home page footer + Village-of-North-Chevy-Chase
-- Charter page -- cross-checked against msa.maryland.gov/msa/mdmanual/
-- 37mun/northchevy/, fetched live 2026-08-11, both agree): Chair Adrian
-- L. Andreassi and Vice-Chair Maury J. Mechanick, reelected (ran
-- unopposed per the Maryland Manual) May 5, 2026, term to 2028; Treasurer
-- Geetika Sripathi, also reelected unopposed May 5, 2026 (term to 2028)
-- -- REAL TRANSITION CAUGHT, NOT SMOOTHED OVER: Sripathi was not
-- originally elected to this seat -- Council minutes (Council Meeting,
-- July 15, 2025: "Addition of Geetika Sripathi to VoNCC Council as
-- Council Member and Treasurer") record that she was APPOINTED by the
-- remaining Council members, per Charter Section 5.08, to serve out the
-- remainder of the term of Olga Joos, who resigned effective June 29,
-- 2025; Sripathi was then formally reelected outright at the May 5, 2026
-- Annual Meeting. Both her office_terms rows (appointed, then elected)
-- are modeled below. Secretary Brian M. Hoffner and Member Jonathan J.
-- Macy were elected/reelected May 6, 2025 (2025 Annual Meeting minutes:
-- "Brian Hoffner and Jon Macy were elected to two-year terms as Council
-- members and were administered the oath of office"), term to 2027.
-- Chair/Vice-Chair term_start below (2026-05-05) is an ESTIMATE tied to
-- the most recent Annual Meeting/Council-seat date, per the Maryland
-- Manual's "chosen by Council in May" language -- no source found gives a
-- separate exact date for the internal Chair/Vice-Chair designation
-- itself, and Andreassi had already been serving as Chair going into that
-- same May 5, 2026 meeting per its own minutes, so the true selection
-- date could be earlier; disclosed as an estimate, same discipline used
-- for Poolesville's President/VP dates.
--
-- ACCOUNTABILITY: no citizen-recall or removal provision found -- a real
-- attempt was made: the Village's own Charter PDF (northchevychase.gov,
-- "Reprinted November 2008," also hosted at mgaleg.maryland.gov/Pubs/
-- LegisLegal/Muni-Charters/2008-municipal-charter-north-chevy-chase.pdf),
-- extracted via pdftotext, 834 lines, cleanly parsed, contains zero
-- instances of "recall," and "removal" appears only regarding snow/ash/
-- garbage removal, not officeholders. Vacancies (including Sripathi's)
-- are filled by remaining-Council-member appointment "until the next
-- regular election" (Charter Section 5.08), not by any citizen mechanism.
-- Note: the Charter does contain a distinct, narrower citizen check not
-- modeled here since it does not remove officeholders -- Section 5.06(d)
-- lets 25 or more Qualified Voters force a referendum, within 30 days of
-- notice of a new ordinance, to rescind that ordinance by majority vote.
--
-- POST-RESEARCH FIX (caught during central cross-verification): Sripathi's
-- appointed-then-elected history was originally modeled as two office_terms
-- rows for the same office/politician pair. The schema's UNIQUE(office_id,
-- politician_id, term_start) constraint permits this, but it deviates from
-- the one-current-row-per-office convention used everywhere else in this
-- project (including the sibling Chevy Chase Village migration's own
-- appointed-then-elected case, Saul Goodman) -- fixed to a single row for
-- her current elected term; the appointment history is preserved in her
-- bio text only.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:north_chevy_chase', 'North Chevy Chase', 'municipal', 'ocd-division/country:us/state:md/county:montgomery')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('30a00000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:north_chevy_chase', 'Village Council', 'at_large', 5, 2, FALSE, TRUE, 'municipal'),
  ('30a00000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:north_chevy_chase', 'Chair', 'single', 1, 1, FALSE, FALSE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('30a00000-0000-4000-8000-000000000101', 'Adrian L. Andreassi', NULL, '30a00000-0000-4000-8000-000000000002', 'Chair of the Village Council -- chosen by fellow Council members annually each May. Council member, reelected (ran unopposed) May 5, 2026, term to 2028.'),
  ('30a00000-0000-4000-8000-000000000102', 'Maury J. Mechanick', NULL, '30a00000-0000-4000-8000-000000000001', 'Vice-Chair -- chosen by fellow Council members annually each May. Council member, reelected (ran unopposed) May 5, 2026, term to 2028.'),
  ('30a00000-0000-4000-8000-000000000103', 'Geetika Sripathi', NULL, '30a00000-0000-4000-8000-000000000001', 'Treasurer -- chosen by fellow Council members. Council member, appointed July 15, 2025 to serve out the remainder of Olga Joos''s term after Joos resigned effective June 29, 2025 (Charter Section 5.08); reelected outright (ran unopposed) May 5, 2026, term to 2028.'),
  ('30a00000-0000-4000-8000-000000000104', 'Brian M. Hoffner', NULL, '30a00000-0000-4000-8000-000000000001', 'Secretary -- chosen by fellow Council members. Council member, reelected May 6, 2025, term to 2027.'),
  ('30a00000-0000-4000-8000-000000000105', 'Jonathan J. Macy', NULL, '30a00000-0000-4000-8000-000000000001', 'Council member ("Member" is this Village''s own internal sub-title for the fifth, otherwise-unspecialized Council seat), reelected May 6, 2025, term to 2027.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('30a00000-0000-4000-8000-000000000001', '30a00000-0000-4000-8000-000000000101', '2026-05-05', 'elected'),
  ('30a00000-0000-4000-8000-000000000002', '30a00000-0000-4000-8000-000000000101', '2026-05-05', 'appointed'),
  ('30a00000-0000-4000-8000-000000000001', '30a00000-0000-4000-8000-000000000102', '2026-05-05', 'elected'),
  ('30a00000-0000-4000-8000-000000000001', '30a00000-0000-4000-8000-000000000103', '2026-05-05', 'elected'),
  ('30a00000-0000-4000-8000-000000000001', '30a00000-0000-4000-8000-000000000104', '2025-05-06', 'elected'),
  ('30a00000-0000-4000-8000-000000000001', '30a00000-0000-4000-8000-000000000105', '2025-05-06', 'elected');
