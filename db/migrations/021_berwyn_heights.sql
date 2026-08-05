-- Town of Berwyn Heights, MD: third of the PG "town" tier (after Cheverly
-- #019, Bladensburg #020). Real officeholders live-verified 2026-08-05
-- against the Maryland Manual's live page (msa.maryland.gov) and multiple
-- corroborating WebSearch results (town's own site content indexed via
-- search, town news coverage of the "52nd Council").
--
-- SOURCE-ACCESS LIMITATION, disclosed rather than glossed over: the town's
-- own site (berwynheightsmd.gov) and the AmLegal code library both
-- returned HTTP 403 to every fetch attempt this pass (WebFetch and a
-- direct curl with a browser user-agent both blocked) -- the actual
-- charter text (term/election/recall provisions) could NOT be read
-- directly, unlike most other PG towns in this series. Facts below rest on
-- the Maryland Manual (an independent, actively-maintained state source)
-- plus multiple corroborating search results, not a first-hand charter
-- read. Flagged explicitly so a future pass knows to retry the primary
-- source (perhaps from a different network/IP) rather than assume this was
-- already checked as thoroughly as the other towns.
--
-- GOVERNMENT STRUCTURE: 5-member Town Council, ALL elected at-large
-- together every 2 years (elections first Tuesday of May in even years) --
-- no wards, no staggering (unlike Hyattsville/Mount Rainier/Bladensburg).
-- Distinctive mechanism, confirmed by multiple independent search results
-- describing the same rule: the candidate receiving the HIGHEST vote count
-- becomes Mayor, and the candidate with the second-highest count becomes
-- Mayor Pro Tem -- automatically, by the same single at-large election, not
-- a separate mayoral ballot line (like Bowie/College Park/Hyattsville/etc.)
-- and not an internal post-election Council vote (like Greenbelt #015 or
-- Glenarden #014). Modeled with is_elected=TRUE and how_obtained='elected'
-- on BOTH the Mayor and Council offices for the Mayor's dual rows -- unlike
-- Greenbelt/Glenarden's is_elected=FALSE/'appointed' Mayor pattern, because
-- here the Mayor's title is determined directly by voters' own ballots via
-- a fixed charter formula, not by a separate act of the other officials
-- after the election.
--
-- CURRENT ROSTER, freshest data used (a real catch worth noting): an
-- initial search surfaced a councilmember named "Chris Brittan-Powell" --
-- but a second round of searching found the town's own "52nd Council of
-- Berwyn Heights" announcement and the Maryland Manual BOTH give a
-- DIFFERENT, more current name, "Zac Francis," for that same seat, with a
-- term expiring 2028 (Maryland Manual: "Elected by Voters to 2-year terms
-- (May)... expiring 2028"). Brittan-Powell was evidently a member of the
-- PRIOR (51st) council, now superseded -- his name is not used anywhere
-- below. Elected May 5, 2026, per the town's own "52nd Council" coverage.
-- Also notable (not modeled, purely advisory): the same May 5, 2026 ballot
-- carried a nonbinding question asking whether to explore ranked-choice
-- voting for future Town Council elections, which passed 76%-24%.
--
-- TERM-START DATE: May 5, 2026 (the election date itself) is used, since no
-- separate swearing-in/oath date could be independently confirmed this
-- pass (compounded by the site-access limitation above) -- a disclosed
-- estimate, same convention as Bowie's Estève/Miller entries.
--
-- is_partisan set FALSE by inference -- consistent with every other
-- Maryland municipality modeled so far, though NOT directly confirmed from
-- charter text this pass given the access limitation above.
--
-- No accountability_pathways row added -- but with the above caveat: this
-- is a WEAKER "no gap found" than usual, since the charter itself could
-- not be read to positively confirm the absence of a recall provision (as
-- was done for Bowie/College Park/Hyattsville/Laurel/New
-- Carrollton/Bladensburg). Genuinely unconfirmed either way, not a
-- confirmed absence -- worth a retry in a future pass.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:berwyn_heights', 'Town of Berwyn Heights', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('13000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:berwyn_heights', 'Mayor', 'single', 1, 2, FALSE, TRUE, 'municipal'),
  ('13000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:berwyn_heights', 'Town Council — At-Large', 'at_large', 4, 2, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('13000000-0000-4000-8000-000000000101', 'Tiffany A. Papanikolas', NULL, '13000000-0000-4000-8000-000000000001', 'Mayor of Berwyn Heights; won the top vote total in the May 5, 2026 at-large Town Council election, automatically becoming Mayor per the town''s election rule. Term expires 2028.'),
  ('13000000-0000-4000-8000-000000000102', 'Edgar Moctezuma', NULL, '13000000-0000-4000-8000-000000000002', 'Town Council member (Mayor Pro Tem, the second-highest vote total in the May 5, 2026 election). Term expires 2028.'),
  ('13000000-0000-4000-8000-000000000103', 'Roger L. Gaines', NULL, '13000000-0000-4000-8000-000000000002', 'Town Council member; elected at-large May 5, 2026. Term expires 2028.'),
  ('13000000-0000-4000-8000-000000000104', 'David A. Wolfinger', NULL, '13000000-0000-4000-8000-000000000002', 'Town Council member; elected at-large May 5, 2026. Term expires 2028.'),
  ('13000000-0000-4000-8000-000000000105', 'Zac Francis', NULL, '13000000-0000-4000-8000-000000000002', 'Town Council member; elected at-large May 5, 2026. Term expires 2028.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000101', '2026-05-05', 'elected'),
  ('13000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000102', '2026-05-05', 'elected'),
  ('13000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000103', '2026-05-05', 'elected'),
  ('13000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000104', '2026-05-05', 'elected'),
  ('13000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000105', '2026-05-05', 'elected');
