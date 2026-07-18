-- VoteRight PRODUCTION seed — STRUCTURAL ONLY (docs/DATA-OPS.md §0/D0).
-- Real county structure: jurisdictions, offices, the 2026 cycle and its races,
-- topics/axes (VoteRight's own published scoring instrument), and the verified
-- accountability pathways. NO PEOPLE: politicians, candidacies, terms,
-- positions, promises, users, and all content arrive only via the D1+ cited
-- ingestion pipeline. db/seed.sql (fictional people) is DEV-ONLY, forever.
-- Re-verify flagged facts at D1 cutover: office roster, registered_voter_count,
-- Rockville structure (Mayor + 6-member Council since Nov 2023).

-- ── Geography ──────────────────────────────────────────────────────────────
INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, registered_voter_count, registered_voter_count_as_of) VALUES
 ('ocd-division/country:us/state:md', 'Maryland', 'state', NULL, NULL, NULL),
 ('ocd-division/country:us/state:md/county:montgomery', 'Montgomery County', 'county', 'ocd-division/country:us/state:md', 686000, '2026-06-01'),
 ('ocd-division/country:us/state:md/place:rockville', 'City of Rockville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery', NULL, NULL);

-- ── Offices (real roster; 11-member Council since Dec 2022) ────────────────
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
 ('00000000-0000-4000-8000-000000000401', 'ocd-division/country:us/state:md/county:montgomery', 'County Executive', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000402', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — At-Large', 'at_large', 4, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000421', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 1', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000422', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 2', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000423', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 3', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000424', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 4', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000403', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 5', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000425', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 6', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000426', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 7', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000404', 'ocd-division/country:us/state:md/county:montgomery', 'Sheriff', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000405', 'ocd-division/country:us/state:md/county:montgomery', 'State''s Attorney', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000406', 'ocd-division/country:us/state:md/county:montgomery', 'Clerk of the Circuit Court', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000407', 'ocd-division/country:us/state:md/county:montgomery', 'Register of Wills', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000408', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — At-Large', 'at_large', 2, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000409', 'ocd-division/country:us/state:md/county:montgomery', 'Circuit Court Judges', 'at_large', 4, 15, FALSE, TRUE, 'judicial'),
 ('00000000-0000-4000-8000-000000000411', 'ocd-division/country:us/state:md/place:rockville', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
 ('00000000-0000-4000-8000-000000000412', 'ocd-division/country:us/state:md/place:rockville', 'City Council', 'at_large', 6, 4, FALSE, TRUE, 'municipal');

-- ── 2026 cycle + tracked races (real contests; candidacies arrive in D1) ───
INSERT INTO election_cycles (id, name, election_date, election_type, commentary_promotion_blackout_days) VALUES
 ('00000000-0000-4000-8000-000000000301', '2026 Maryland General', '2026-11-03', 'general', 30);
INSERT INTO races (id, election_cycle_id, office_id, seats_elected) VALUES
 ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', 1),
 ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000402', 4);

-- ── Topics + axes (SCORING.md S2 — VoteRight's published instrument) ───────
INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000101', 'Housing affordability'),
 ('00000000-0000-4000-8000-000000000102', 'Transit & roads'),
 ('00000000-0000-4000-8000-000000000103', 'Public schools'),
 ('00000000-0000-4000-8000-000000000104', 'Climate & environment'),
 ('00000000-0000-4000-8000-000000000105', 'Public safety'),
 ('00000000-0000-4000-8000-000000000106', 'Taxes & budget');
INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole) VALUES
 ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101', 'rent_stabilization', 'Should annual rent increases stay capped near the current limit?', 'Repeal the cap', 'Keep or tighten the cap'),
 ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000102', 'bus_network_expansion', 'Should Ride On bus service expand countywide?', 'Hold current service', 'Expand countywide'),
 ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000103', 'mcps_full_funding', 'Should the county fully fund the MCPS operating budget request?', 'Fund below the request', 'Fully fund the request'),
 ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000104', 'zero_emissions_schedule', 'Should the county meet its zero-emissions targets on schedule?', 'Delay or relax targets', 'Keep or accelerate targets'),
 ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000105', 'police_staffing', 'Should the county hire more police officers for neighborhood patrols?', 'Hold or redirect staffing', 'Hire more officers'),
 ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000106', 'property_tax_line', 'Should the county hold the line on property-tax increases?', 'Open to increases', 'No increases');

-- ── Accountability pathways (real legal facts, §2.1/§2.1.1 — verified) ─────
INSERT INTO accountability_pathways (id, jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description) VALUES
 ('00000000-0000-4000-8000-000000000f01', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000402', 'supermajority_council_removal', TRUE,
  'Montgomery County Charter §118', NULL,
  'A councilmember can be removed only by a 7-of-11 Council vote, after a public hearing, and only on a finding of physical or mental disability preventing service — not for policy disagreement or broken promises. Appealable de novo to the Circuit Court.'),
 ('00000000-0000-4000-8000-000000000f02', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000402', 'next_election_defeat', TRUE,
  'Md. Election Law — regular county election (2026 general)', NULL,
  'All four at-large Council seats are on the ballot at the regular county election. The ordinary, guaranteed lever — no petition required.'),
 ('00000000-0000-4000-8000-000000000f03', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000402', 'primary_challenge_support', FALSE,
  'Md. Election Law Title 5 (candidacy filing)', NULL,
  'Organize support for a primary challenger in the next cycle. Not a legal mechanism — ordinary electoral politics, done early.'),
 ('00000000-0000-4000-8000-000000000f04', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000401', 'no_removal_mechanism_exists', FALSE,
  'Montgomery County Charter (no recall or removal provision for the Executive)', NULL,
  'No mechanism removes a sitting County Executive before the next election, short of criminal conviction. The County''s own 2022 Charter Review Commission considered adding recall and voted against it.'),
 ('00000000-0000-4000-8000-000000000f05', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000401', 'criminal_referral', TRUE,
  'Md. Constitution (removal upon conviction of certain crimes)', NULL,
  'Conviction of certain crimes triggers removal under the Maryland Constitution — a matter for prosecutors and courts, never for petitions or apps.'),
 ('00000000-0000-4000-8000-000000000f06', 'ocd-division/country:us/state:md/county:montgomery',
  '00000000-0000-4000-8000-000000000401', 'next_election_defeat', TRUE,
  'Md. Election Law — regular county election (2026 general)', NULL,
  'The Executive''s seat is on the ballot at the regular county election (2026: open seat — the incumbent is term-limited).'),
 ('00000000-0000-4000-8000-000000000f07', 'ocd-division/country:us/state:md/county:montgomery',
  NULL, 'charter_amendment_petition', TRUE,
  'Md. Const. Art. XI-A, Sec. 5; Local Government Article',
  '20% of registered voters, or 10,000 signatures, whichever is FEWER (the 2024 term-limit petition qualified with 15,956 certified signatures)',
  'Voters can amend the County Charter directly by petition — the binding path that could, for example, create the recall provision that does not exist today. Used successfully in 2008, 2016, and 2024.');
