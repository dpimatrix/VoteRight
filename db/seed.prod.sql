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
 ('ocd-division/country:us/state:md/place:rockville', 'City of Rockville', 'municipal', 'ocd-division/country:us/state:md/county:montgomery', NULL, NULL),
 -- Virginia's state-level row only (not its counties -- not needed by
 -- anything seeded here): migration 109's VA-scoped topic_axes rows
 -- FK-reference it, and this structural fixture otherwise stays frozen at
 -- the original Montgomery-pilot geography (real production got this row
 -- from migration 004, never replayed into this file before now).
 ('ocd-division/country:us/state:va', 'Virginia', 'state', NULL, NULL, NULL);

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
 ('00000000-0000-4000-8000-000000000301', '2026 Maryland General', '2026-11-03', 'general', 30),
 ('00000000-0000-4000-8000-000000000302', '2026 Virginia General', '2026-11-03', 'general', 30);
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
-- jurisdiction_id (migration 105): these 6 are Montgomery-County-specific
-- in content (MCPS, Ride On), not generically "any county" -- scoped so a
-- fresh prod DB matches a migrated one instead of defaulting to nationwide.
INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101', 'rent_stabilization', 'Should annual rent increases stay capped near the current limit?', 'Repeal the cap', 'Keep or tighten the cap', 'ocd-division/country:us/state:md/county:montgomery'),
 ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000102', 'bus_network_expansion', 'Should Ride On bus service expand countywide?', 'Hold current service', 'Expand countywide', 'ocd-division/country:us/state:md/county:montgomery'),
 ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000103', 'mcps_full_funding', 'Should the county fully fund the MCPS operating budget request?', 'Fund below the request', 'Fully fund the request', 'ocd-division/country:us/state:md/county:montgomery'),
 ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000104', 'zero_emissions_schedule', 'Should the county meet its zero-emissions targets on schedule?', 'Delay or relax targets', 'Keep or accelerate targets', 'ocd-division/country:us/state:md/county:montgomery'),
 ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000105', 'police_staffing', 'Should the county hire more police officers for neighborhood patrols?', 'Hold or redirect staffing', 'Hire more officers', 'ocd-division/country:us/state:md/county:montgomery'),
 ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000106', 'property_tax_line', 'Should the county hold the line on property-tax increases?', 'Open to increases', 'No increases', 'ocd-division/country:us/state:md/county:montgomery');

-- migration 106: draft federal axes, DRAFTED BY CLAUDE, NOT PUBLISHED --
-- see that migration file's header for the full fit-analysis rationale.
-- status='draft' + jurisdiction_id NULL (nationwide) mirrored here so a
-- fresh dev DB's admin review queue matches a freshly-migrated one.
INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000201', 'Immigration'),
 ('00000000-0000-4000-8000-000000000202', 'Health care'),
 ('00000000-0000-4000-8000-000000000203', 'Reproductive rights'),
 ('00000000-0000-4000-8000-000000000204', 'Foreign policy & defense');
INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000104', 'clean_energy_transition', 'Should the federal government expand incentives for clean energy and emissions reductions, or prioritize traditional energy production and reduced regulation?', 'Prioritize traditional energy production', 'Expand clean-energy incentives', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000212', '00000000-0000-4000-8000-000000000106', 'federal_income_tax_level', 'Should federal income tax rates be cut, or kept at current levels/raised on higher incomes?', 'Cut broadly', 'Keep or raise on higher incomes', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000213', '00000000-0000-4000-8000-000000000102', 'federal_transit_infrastructure_funding', 'Should federal funding for public transit and infrastructure increase?', 'Reduce or hold funding', 'Increase funding', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000214', '00000000-0000-4000-8000-000000000103', 'federal_k12_funding', 'Should federal funding for K-12 public schools (Title I, special education) increase?', 'Reduce or hold funding', 'Increase funding', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000215', '00000000-0000-4000-8000-000000000201', 'immigration_legal_pathways', 'Should Congress expand legal pathways to citizenship/status for undocumented immigrants, or prioritize border security and enforcement funding?', 'Prioritize enforcement', 'Expand legal pathways', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000216', '00000000-0000-4000-8000-000000000202', 'federal_health_coverage_role', 'Should the federal government expand public health coverage (ACA subsidies, Medicaid), or reduce its role and rely more on private markets?', 'Reduce federal role', 'Expand coverage', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000217', '00000000-0000-4000-8000-000000000203', 'federal_abortion_access', 'Should Congress codify federal protections for abortion access, or restrict abortion access at the federal level?', 'Restrict abortion access', 'Codify abortion-access protections', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000218', '00000000-0000-4000-8000-000000000204', 'defense_spending_level', 'Should federal defense/military spending increase?', 'Reduce spending', 'Increase spending', 'draft', 'Claude, pending human review (2026-09-22)', NULL);

-- migration 108: second batch of draft federal axes, DRAFTED BY CLAUDE, NOT
-- PUBLISHED -- see that migration file's header for the full rationale.
INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000205', 'Criminal justice'),
 ('00000000-0000-4000-8000-000000000206', 'Voting & elections'),
 ('00000000-0000-4000-8000-000000000207', 'Labor & wages'),
 ('00000000-0000-4000-8000-000000000208', 'Higher education'),
 ('00000000-0000-4000-8000-000000000209', 'Drug policy'),
 ('00000000-0000-4000-8000-000000000210', 'Trade');
INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000219', '00000000-0000-4000-8000-000000000105', 'gun_background_checks', 'Should Congress expand background-check requirements for gun purchases, or protect current purchasing processes from new restrictions?', 'Protect current purchasing process', 'Expand background checks', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000220', '00000000-0000-4000-8000-000000000205', 'federal_criminal_justice_reform', 'Should Congress expand federal criminal-justice reform (sentencing reform, policing oversight), or maintain current federal sentencing/policing standards?', 'Maintain current standards', 'Expand reform', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000206', 'federal_voting_access_standards', 'Should Congress set new federal standards expanding voting access, or leave election administration primarily to the states?', 'Leave to the states', 'Expand federal voting-access standards', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000222', '00000000-0000-4000-8000-000000000207', 'federal_minimum_wage', 'Should Congress raise the federal minimum wage, or leave current wage-setting primarily to states/employers?', 'Leave to states/employers', 'Raise the federal minimum wage', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000223', '00000000-0000-4000-8000-000000000208', 'federal_student_loan_relief', 'Should the federal government expand student loan forgiveness/relief, or hold borrowers to current repayment terms?', 'Hold to current repayment terms', 'Expand forgiveness/relief', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000224', '00000000-0000-4000-8000-000000000209', 'federal_cannabis_policy', 'Should Congress ease federal restrictions on cannabis (rescheduling/legalization), or maintain current federal drug-scheduling law?', 'Maintain current federal law', 'Ease federal restrictions', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000225', '00000000-0000-4000-8000-000000000210', 'federal_trade_tariff_policy', 'Should Congress limit executive tariff authority and expand free trade agreements, or preserve broad tariff authority to protect domestic industries?', 'Preserve tariff authority', 'Limit tariffs / expand free trade', 'draft', 'Claude, pending human review (2026-09-30)', NULL);

-- migration 109: first batch of draft STATE-level axes (MD + VA), DRAFTED BY
-- CLAUDE, NOT PUBLISHED -- see that migration file's header for the full
-- sourcing method and jurisdiction-scoping rationale.
INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000231', 'Housing & land use'),
 ('00000000-0000-4000-8000-000000000232', 'Data privacy'),
 ('00000000-0000-4000-8000-000000000233', 'Energy & utilities'),
 ('00000000-0000-4000-8000-000000000234', 'Technology & AI regulation'),
 ('00000000-0000-4000-8000-000000000235', 'Prescription drug costs');
INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000236', '00000000-0000-4000-8000-000000000206', 'md_election_administration', 'Should Maryland expand voter-access provisions in election administration (early voting, accessible/expedited voting, plain-language ballot questions), or keep current election-administration rules as they are?', 'Keep current rules', 'Expand voter-access provisions', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 ('00000000-0000-4000-8000-000000000237', '00000000-0000-4000-8000-000000000206', 'va_election_administration', 'Should Virginia expand voter-registration and voting-access tools (DMV-linked registration, ranked-choice voting), or keep current election-administration rules as they are?', 'Keep current rules', 'Expand registration/voting-access tools', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),
 ('00000000-0000-4000-8000-000000000238', '00000000-0000-4000-8000-000000000105', 'md_immigration_enforcement_cooperation', 'Should Maryland restrict state and local cooperation with federal immigration enforcement (limiting information-sharing, as in the Community Trust Act), or maintain/expand that cooperation?', 'Maintain/expand cooperation', 'Restrict cooperation', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 ('00000000-0000-4000-8000-000000000239', '00000000-0000-4000-8000-000000000232', 'md_consumer_data_privacy', 'Should Maryland expand consumer data-privacy protections and restrictions on data collection/sharing (as in the Maryland Data Privacy Act), or keep current, lighter data-privacy requirements on businesses?', 'Keep current, lighter requirements', 'Expand data-privacy protections', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 ('00000000-0000-4000-8000-000000000240', '00000000-0000-4000-8000-000000000232', 'va_consumer_data_privacy', 'Should Virginia expand consumer data-privacy protections, including for children (as in the Consumer Data Protection Act), or keep current data-privacy requirements on businesses as they are?', 'Keep current requirements', 'Expand data-privacy protections', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),
 ('00000000-0000-4000-8000-000000000241', '00000000-0000-4000-8000-000000000231', 'md_housing_zoning_preemption', 'Should Maryland law make it easier to build housing by limiting local zoning/permitting barriers (as in the Maryland Housing Certainty Act), or preserve local governments'' current zoning and permitting authority?', 'Preserve local zoning/permitting authority', 'Limit local barriers to ease housing development', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 ('00000000-0000-4000-8000-000000000242', '00000000-0000-4000-8000-000000000231', 'va_housing_zoning_preemption', 'Should Virginia expand state authority to override local zoning barriers to affordable-housing construction, or preserve localities'' current zoning authority?', 'Preserve local zoning authority', 'Expand state authority to ease housing construction', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),
 ('00000000-0000-4000-8000-000000000243', '00000000-0000-4000-8000-000000000233', 'va_data_center_energy_siting', 'Should Virginia impose new state oversight or limits on data-center siting and the electric infrastructure built to serve them, or continue allowing data-center development and utility buildout largely as it is now?', 'Continue largely as-is', 'Impose new state oversight/limits', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),
 ('00000000-0000-4000-8000-000000000244', '00000000-0000-4000-8000-000000000234', 'va_synthetic_media_regulation', 'Should Virginia expand criminal/civil penalties and restrictions on AI-generated synthetic media (deepfakes used for fraud, defamation, or election interference), or rely on existing law without new synthetic-media-specific rules?', 'Rely on existing law, no new synthetic-media rules', 'Expand synthetic-media-specific penalties/restrictions', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),
 ('00000000-0000-4000-8000-000000000245', '00000000-0000-4000-8000-000000000235', 'md_prescription_drug_affordability', 'Should Maryland strengthen the Prescription Drug Affordability Board''s authority to cap or limit drug costs (as in the Lowering Prescription Drug Costs for All Marylanders Now Act), or limit the Board''s authority and rely more on market pricing?', 'Limit Board authority, rely on market pricing', 'Strengthen Board''s cost-capping authority', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md');

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
