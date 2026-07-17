-- VoteRight Phase 1 seed.
-- Real: county geography, office roster, election cycle, topics/axes, legal structure.
-- Fictional BY DESIGN (ARCHITECTURE.md §2.3): every politician, position, citation,
-- expenditure, and endorsement below. Real names never carry invented positions.

-- ── Geography ──────────────────────────────────────────────────────────────
INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id, registered_voter_count, registered_voter_count_as_of) VALUES
 ('ocd-division/country:us/state:md', 'Maryland', 'state', NULL, NULL, NULL),
 ('ocd-division/country:us/state:md/county:montgomery', 'Montgomery County', 'county', 'ocd-division/country:us/state:md', 686000, '2026-06-01');

-- ── Offices (real roster; 11-member Council since Dec 2022) ────────────────
INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
 ('00000000-0000-4000-8000-000000000401', 'ocd-division/country:us/state:md/county:montgomery', 'County Executive', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000402', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — At-Large', 'at_large', 4, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000403', 'ocd-division/country:us/state:md/county:montgomery', 'County Council — District 5', 'district', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000404', 'ocd-division/country:us/state:md/county:montgomery', 'Sheriff', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000405', 'ocd-division/country:us/state:md/county:montgomery', 'State''s Attorney', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000406', 'ocd-division/country:us/state:md/county:montgomery', 'Clerk of the Circuit Court', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000407', 'ocd-division/country:us/state:md/county:montgomery', 'Register of Wills', 'single', 1, 4, TRUE, TRUE, 'county'),
 ('00000000-0000-4000-8000-000000000408', 'ocd-division/country:us/state:md/county:montgomery', 'Board of Education — At-Large', 'at_large', 2, 4, FALSE, TRUE, 'school_board'),
 ('00000000-0000-4000-8000-000000000409', 'ocd-division/country:us/state:md/county:montgomery', 'Circuit Court Judges', 'at_large', 4, 15, FALSE, TRUE, 'judicial');

-- ── 2026 cycle + tracked races ─────────────────────────────────────────────
INSERT INTO election_cycles (id, name, election_date, election_type, commentary_promotion_blackout_days) VALUES
 ('00000000-0000-4000-8000-000000000301', '2026 Maryland General', '2026-11-03', 'general', 30);
INSERT INTO races (id, election_cycle_id, office_id, seats_elected) VALUES
 ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', 1),
 ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000402', 4);

-- ── Topics + axes (SCORING.md S2) ──────────────────────────────────────────
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

-- ── Fictional politicians + candidacies ────────────────────────────────────
INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
 ('00000000-0000-4000-8000-000000000201', 'Maya Trent', 'D', '00000000-0000-4000-8000-000000000402', 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000202', 'Rafael Quintana', 'D', '00000000-0000-4000-8000-000000000402', 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000203', 'Dana Okafor', 'I', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000204', 'Colin Breuer', 'R', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000205', 'Priya Raman', 'D', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000206', 'Jordan Quinn', 'I', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000207', 'Elena Vásquez', 'D', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000208', 'Marcus Hollis', 'D', NULL, 'Fictional sample candidate.'),
 ('00000000-0000-4000-8000-000000000209', 'Teresa Nakamura', 'R', NULL, 'Fictional sample candidate.');
INSERT INTO candidacies (id, politician_id, race_id, party) VALUES
 ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000000212', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000000213', '00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000502', 'I'),
 ('00000000-0000-4000-8000-000000000214', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000502', 'R'),
 ('00000000-0000-4000-8000-000000000215', '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000502', 'D'),
 ('00000000-0000-4000-8000-000000000216', '00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000502', 'I'),
 ('00000000-0000-4000-8000-000000000217', '00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000501', 'D'),
 ('00000000-0000-4000-8000-000000000218', '00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000501', 'D'),
 ('00000000-0000-4000-8000-000000000219', '00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000501', 'R');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000201', '2022-12-05', 'elected'),
 ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000202', '2022-12-05', 'elected');
INSERT INTO race_incumbents (race_id, politician_id) VALUES
 ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000201'),
 ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000202');

-- ── Positions + citations + staff codings (one loop; SCORING.md S2) ────────
DO $$
DECLARE r jsonb; top uuid; ax uuid; cit uuid; pos uuid;
BEGIN
FOR r IN SELECT * FROM jsonb_array_elements($J$[
 {"pol":"201","topic":"Housing affordability","val":2,"src":"voting_record_inferred","date":"2023-07-18","pub":"Legistar","title":"Bill 15-23 (Rent Stabilization) · roll call · YES","stmt":"Voted for the county rent stabilization law; supports keeping the cap."},
 {"pol":"201","topic":"Transit & roads","val":1,"src":"campaign_site","date":"2026-03-02","pub":"mayatrent.example","title":"Transit plan","stmt":"More frequent Ride On service on major corridors, phased by budget."},
 {"pol":"201","topic":"Public schools","val":2,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Schools answers","stmt":"Pledges to fully fund the MCPS request every year of the term."},
 {"pol":"201","topic":"Climate & environment","val":2,"src":"voting_record_inferred","date":"2022-04-12","pub":"Legistar","title":"Bill 13-22 (Building Energy Performance) · roll call · YES","stmt":"Voted for building energy performance standards."},
 {"pol":"201","topic":"Public safety","val":0,"src":"debate_transcript","date":"2026-05-20","pub":"At-large forum","title":"Forum transcript","stmt":"Supports current staffing with more violence-interruption investment."},
 {"pol":"201","topic":"Taxes & budget","val":-1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Budget answers","stmt":"Open to a modest property-tax increase if tied to schools."},
 {"pol":"202","topic":"Housing affordability","val":-1,"src":"voting_record_inferred","date":"2023-07-18","pub":"Legistar","title":"Bill 15-23 (Rent Stabilization) · roll call · NO","stmt":"Voted against the rent cap."},
 {"pol":"202","topic":"Housing affordability","val":-1,"src":"campaign_site","date":"2026-02-11","pub":"quintanaforcouncil.example","title":"Housing plan","stmt":"Supply-side zoning reform lowers rents faster than caps."},
 {"pol":"202","topic":"Transit & roads","val":2,"src":"voting_record_inferred","date":"2025-05-15","pub":"Legistar","title":"FY26 budget amendment · roll call · YES","stmt":"Sponsored the amendment expanding Ride On weekend frequency."},
 {"pol":"202","topic":"Public schools","val":1,"src":"campaign_site","date":"2026-02-11","pub":"quintanaforcouncil.example","title":"Schools plan","stmt":"Increase MCPS funding, short of the full request."},
 {"pol":"202","topic":"Climate & environment","val":1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Climate answers","stmt":"Backs targets with timeline flexibility for small buildings."},
 {"pol":"202","topic":"Public safety","val":1,"src":"campaign_site","date":"2026-02-11","pub":"quintanaforcouncil.example","title":"Safety plan","stmt":"Add patrol officers in high-incident corridors."},
 {"pol":"202","topic":"Taxes & budget","val":1,"src":"debate_transcript","date":"2026-05-20","pub":"At-large forum","title":"Forum transcript","stmt":"Would not support a property-tax increase this term."},
 {"pol":"203","topic":"Housing affordability","val":1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Housing answers","stmt":"Keep the cap while the affordability study runs."},
 {"pol":"203","topic":"Transit & roads","val":0,"src":"debate_transcript","date":"2026-05-20","pub":"At-large forum","title":"Forum transcript","stmt":"More frequency yes, but road maintenance first."},
 {"pol":"203","topic":"Public schools","val":2,"src":"campaign_site","date":"2026-01-15","pub":"okafor2026.example","title":"Platform","stmt":"Full MCPS funding is the centerpiece of the campaign."},
 {"pol":"203","topic":"Public safety","val":2,"src":"campaign_site","date":"2026-01-15","pub":"okafor2026.example","title":"Platform","stmt":"120 additional patrol officers over four years."},
 {"pol":"203","topic":"Taxes & budget","val":0,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Budget answers","stmt":"Decide on taxes only after a line-by-line review."},
 {"pol":"204","topic":"Housing affordability","val":-2,"src":"campaign_site","date":"2026-02-01","pub":"breuerforcouncil.example","title":"Platform","stmt":"Would repeal the rent cap; calls it a deterrent to construction."},
 {"pol":"204","topic":"Transit & roads","val":-1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Transit answers","stmt":"Prioritizes road capacity over bus expansion."},
 {"pol":"204","topic":"Public schools","val":0,"src":"debate_transcript","date":"2026-05-20","pub":"At-large forum","title":"Forum transcript","stmt":"Independent audit before more school funding."},
 {"pol":"204","topic":"Climate & environment","val":-1,"src":"campaign_site","date":"2026-02-01","pub":"breuerforcouncil.example","title":"Platform","stmt":"Compliance costs fall too hard on small property owners."},
 {"pol":"204","topic":"Public safety","val":2,"src":"campaign_site","date":"2026-02-01","pub":"breuerforcouncil.example","title":"Platform","stmt":"Police hiring is the first plank."},
 {"pol":"204","topic":"Taxes & budget","val":2,"src":"campaign_site","date":"2026-02-01","pub":"breuerforcouncil.example","title":"Platform","stmt":"No-new-taxes pledge for the full term."},
 {"pol":"205","topic":"Housing affordability","val":2,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Housing answers","stmt":"Keep the cap and pair it with a county acquisition fund."},
 {"pol":"205","topic":"Transit & roads","val":2,"src":"campaign_site","date":"2026-03-05","pub":"ramanforall.example","title":"Platform","stmt":"Late-night service countywide as a first-year priority."},
 {"pol":"205","topic":"Public schools","val":1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Schools answers","stmt":"Grow MCPS funding toward the full request over two budgets."},
 {"pol":"205","topic":"Climate & environment","val":2,"src":"campaign_site","date":"2026-03-05","pub":"ramanforall.example","title":"Platform","stmt":"Accelerate the fleet-electrification schedule."},
 {"pol":"205","topic":"Public safety","val":-1,"src":"debate_transcript","date":"2026-05-20","pub":"At-large forum","title":"Forum transcript","stmt":"Crisis-response teams over adding patrol officers."},
 {"pol":"205","topic":"Taxes & budget","val":-1,"src":"campaign_site","date":"2026-03-05","pub":"ramanforall.example","title":"Platform","stmt":"Open to a small increase dedicated to transit."},
 {"pol":"206","topic":"Public schools","val":1,"src":"campaign_site","date":"2026-03-01","pub":"quinnindependent.example","title":"Statement","stmt":"Supports increased school funding."},
 {"pol":"207","topic":"Housing affordability","val":2,"src":"campaign_site","date":"2026-02-15","pub":"vasquezforexec.example","title":"Platform","stmt":"Defend the rent cap; expand the acquisition fund."},
 {"pol":"207","topic":"Transit & roads","val":1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Transit answers","stmt":"Phased Ride On expansion tied to state matching funds."},
 {"pol":"207","topic":"Public schools","val":2,"src":"debate_transcript","date":"2026-05-22","pub":"Executive debate","title":"Debate transcript","stmt":"Full MCPS request in the first budget."},
 {"pol":"207","topic":"Climate & environment","val":1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Climate answers","stmt":"Back the targets; review small-building timelines."},
 {"pol":"207","topic":"Public safety","val":0,"src":"campaign_site","date":"2026-02-15","pub":"vasquezforexec.example","title":"Platform","stmt":"Staffing flat; growth to co-responder teams."},
 {"pol":"207","topic":"Taxes & budget","val":-1,"src":"debate_transcript","date":"2026-05-22","pub":"Executive debate","title":"Debate transcript","stmt":"Won't rule out a property-tax increase for schools."},
 {"pol":"208","topic":"Housing affordability","val":0,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Housing answers","stmt":"Keep the cap short-term; sunset as supply arrives."},
 {"pol":"208","topic":"Transit & roads","val":2,"src":"campaign_site","date":"2026-01-20","pub":"hollis2026.example","title":"Platform","stmt":"Countywide bus-rapid-transit build-out."},
 {"pol":"208","topic":"Public schools","val":1,"src":"campaign_site","date":"2026-01-20","pub":"hollis2026.example","title":"Platform","stmt":"Grow MCPS within existing revenue."},
 {"pol":"208","topic":"Climate & environment","val":2,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Climate answers","stmt":"Move the fleet target two years earlier."},
 {"pol":"208","topic":"Public safety","val":1,"src":"debate_transcript","date":"2026-05-22","pub":"Executive debate","title":"Debate transcript","stmt":"Modest patrol growth plus retention bonuses."},
 {"pol":"208","topic":"Taxes & budget","val":0,"src":"debate_transcript","date":"2026-05-22","pub":"Executive debate","title":"Debate transcript","stmt":"No tax position until the FY28 forecast."},
 {"pol":"209","topic":"Housing affordability","val":-2,"src":"campaign_site","date":"2026-02-20","pub":"nakamuraexec.example","title":"Platform","stmt":"Seek repeal of the rent cap in year one."},
 {"pol":"209","topic":"Transit & roads","val":0,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Transit answers","stmt":"Current service levels; no new transit taxes."},
 {"pol":"209","topic":"Public schools","val":1,"src":"campaign_site","date":"2026-02-20","pub":"nakamuraexec.example","title":"Platform","stmt":"More school funding contingent on an efficiency audit."},
 {"pol":"209","topic":"Climate & environment","val":-1,"src":"questionnaire","date":"2026-04-10","pub":"VoteRight questionnaire","title":"Climate answers","stmt":"Extend compliance deadlines for private buildings."},
 {"pol":"209","topic":"Public safety","val":2,"src":"campaign_site","date":"2026-02-20","pub":"nakamuraexec.example","title":"Platform","stmt":"Largest police hiring plan in the race."},
 {"pol":"209","topic":"Taxes & budget","val":2,"src":"debate_transcript","date":"2026-05-22","pub":"Executive debate","title":"Debate transcript","stmt":"Property-tax cut in the first budget."}
]$J$::jsonb)
LOOP
  SELECT id INTO top FROM topics WHERE name = r->>'topic';
  SELECT id INTO ax FROM topic_axes WHERE topic_id = top;
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://' || (r->>'pub') || '/seed', 'https://web.archive.org/web/0/' || (r->>'pub'), r->>'title', r->>'pub', (r->>'date')::date)
   RETURNING id INTO cit;
  INSERT INTO politician_positions (politician_id, topic_id, statement, source_type, citation_id, recorded_at)
   VALUES (('00000000-0000-4000-8000-000000000' || (r->>'pol'))::uuid, top, r->>'stmt', r->>'src', cit, (r->>'date')::timestamptz)
   RETURNING id INTO pos;
  INSERT INTO position_codings (position_id, axis_id, value, coding_method, coder_note)
   VALUES (pos, ax, (r->>'val')::int, 'staff', 'Phase 1 seed');
END LOOP;
END $$;

-- ── Transparency: outside money + endorsements (Phase 1 scope, §8.1) ───────
INSERT INTO endorsing_organizations (id, name, org_type) VALUES
 ('00000000-0000-4000-8000-000000000601', 'County Educators Union (fictional)', 'union'),
 ('00000000-0000-4000-8000-000000000602', 'Metro Area Builders Association (fictional)', 'trade_association');
INSERT INTO citations (id, url, archive_url, title, publisher, published_at) VALUES
 ('00000000-0000-4000-8000-000000000801', 'https://educators.example/endorsements', 'https://web.archive.org/web/0/educators.example', '2026 endorsements', 'educators.example', '2026-05-01'),
 ('00000000-0000-4000-8000-000000000802', 'https://builders.example/endorsements', 'https://web.archive.org/web/0/builders.example', '2026 endorsements', 'builders.example', '2026-05-05'),
 ('00000000-0000-4000-8000-000000000803', 'https://elections.maryland.gov/filings/example-1', 'https://web.archive.org/web/0/sbe-filing-1', 'Independent expenditure report (sample)', 'MD SBE filings', '2026-06-01'),
 ('00000000-0000-4000-8000-000000000804', 'https://elections.maryland.gov/filings/example-2', 'https://web.archive.org/web/0/sbe-filing-2', 'Independent expenditure report (sample)', 'MD SBE filings', '2026-06-10');
INSERT INTO endorsements (organization_id, candidacy_id, endorsed_at, citation_id) VALUES
 ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000211', '2026-05-01', '00000000-0000-4000-8000-000000000801'),
 ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000215', '2026-05-01', '00000000-0000-4000-8000-000000000801'),
 ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000212', '2026-05-05', '00000000-0000-4000-8000-000000000802');
INSERT INTO independent_expenditure_committees (id, name, committee_type, registration_id) VALUES
 ('00000000-0000-4000-8000-000000000701', 'Homes for MoCo PAC (fictional)', 'super_pac', 'SBE-EX-0000');
INSERT INTO independent_expenditures (committee_id, race_id, benefits_politician_id, direction, amount_usd, expenditure_date, purpose, citation_id) VALUES
 ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000204', 'supporting', 48000.00, '2026-06-01', 'digital ads', '00000000-0000-4000-8000-000000000803'),
 ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000201', 'opposing', 22500.00, '2026-06-10', 'mailers', '00000000-0000-4000-8000-000000000804');

-- ═══════════════════════════ PHASE 2 SEED ═══════════════════════════
-- Promises with append-only histories, integrity flags in three states,
-- and a model-suggested coding queue. All fictional by design (§2.3).

-- ── Promises (Trent ×4, Quintana ×2) ──
DO $$
DECLARE r jsonb; ev jsonb; top uuid; pid uuid; cit uuid;
BEGIN
FOR r IN SELECT * FROM jsonb_array_elements($J$[
 {"pol":"201","topic":"Housing affordability","stmt":"Pass rent stabilization","made":"2022-11-01","status":"kept","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"mayatrent.example"},
   {"st":"in_progress","d":"2023-03-14","note":"Co-sponsored Bill 15-23.","pub":"Legistar"},
   {"st":"kept","d":"2023-07-18","note":"Enacted — voted YES on final passage.","pub":"Legistar"}]},
 {"pol":"201","topic":"Housing affordability","stmt":"Office hours in every district, every year","made":"2022-11-01","status":"broken","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"mayatrent.example"},
   {"st":"kept","d":"2023-12-15","note":"Held in all seven districts in 2023.","pub":"Council calendar"},
   {"st":"broken","d":"2026-01-10","note":"None held in 2025, per the public calendar. REPLY (right of reply): \"2025 sessions were canceled during the budget emergency; a make-up schedule is posted.\"","pub":"Council calendar"}]},
 {"pol":"201","topic":"Housing affordability","stmt":"Quadruple the housing acquisition fund","made":"2022-11-01","status":"in_progress","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"mayatrent.example"},
   {"st":"in_progress","d":"2024-05-20","note":"Fund doubled in the FY25 budget — halfway there.","pub":"Legistar"}]},
 {"pol":"201","topic":"Climate & environment","stmt":"All-electric county vehicle purchases by 2025","made":"2022-11-01","status":"compromised","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"mayatrent.example"},
   {"st":"compromised","d":"2025-09-30","note":"60% electric by the deadline; supported a revised 2027 target.","pub":"Legistar"}]},
 {"pol":"202","topic":"Transit & roads","stmt":"Weekend bus frequency on the busiest routes","made":"2022-11-01","status":"kept","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"quintanaforcouncil.example"},
   {"st":"kept","d":"2025-05-15","note":"FY26 amendment funded the expansion.","pub":"Legistar"}]},
 {"pol":"202","topic":"Housing affordability","stmt":"Public inventory of county land for affordable housing","made":"2022-11-01","status":"stalled","hist":[
   {"st":"pending","d":"2022-11-01","note":"Campaign pledge.","pub":"quintanaforcouncil.example"},
   {"st":"in_progress","d":"2024-02-01","note":"Pilot list published for two districts.","pub":"Council staff report"},
   {"st":"stalled","d":"2025-06-01","note":"No update in 12+ months.","pub":"Council staff report"}]}
]$J$::jsonb)
LOOP
  SELECT id INTO top FROM topics WHERE name = r->>'topic';
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://' || (r->'hist'->0->>'pub') || '/pledge', 'https://web.archive.org/web/0/pledge', 'Pledge: ' || (r->>'stmt'), r->'hist'->0->>'pub', (r->>'made')::date)
   RETURNING id INTO cit;
  INSERT INTO promises (politician_id, topic_id, statement, made_at, origin_citation_id, current_status)
   VALUES (('00000000-0000-4000-8000-000000000' || (r->>'pol'))::uuid, top, r->>'stmt', (r->>'made')::date, cit, r->>'status')
   RETURNING id INTO pid;
  FOR ev IN SELECT * FROM jsonb_array_elements(r->'hist') LOOP
    INSERT INTO citations (url, archive_url, title, publisher, published_at)
     VALUES ('https://' || (ev->>'pub') || '/evt', 'https://web.archive.org/web/0/evt', ev->>'note', ev->>'pub', (ev->>'d')::date)
     RETURNING id INTO cit;
    INSERT INTO promise_status_events (promise_id, status, citation_id, note, recorded_at)
     VALUES (pid, ev->>'st', cit, ev->>'note', (ev->>'d')::timestamptz);
  END LOOP;
END LOOP;
END $$;

-- ── Integrity flags: one OPEN (admin demo), one UPHELD·published, one DISMISSED ──
INSERT INTO citations (id, url, archive_url, title, publisher, published_at) VALUES
 ('00000000-0000-4000-8000-000000000811', 'https://legistar.example/fy27-levy', 'https://web.archive.org/web/0/fy27', 'FY27 levy adjustment · roll call', 'Legistar', '2026-06-20'),
 ('00000000-0000-4000-8000-000000000812', 'https://mailer-archive.example/breuer-ff', 'https://web.archive.org/web/0/breuer-ff', 'Mailer scan: "endorsed by county firefighters"', 'VoteRight archive', '2026-05-15'),
 ('00000000-0000-4000-8000-000000000813', 'https://iaff-local.example/endorsements', 'https://web.archive.org/web/0/iaff', 'Firefighters 2026 endorsement list (Breuer absent)', 'iaff-local.example', '2026-05-01'),
 ('00000000-0000-4000-8000-000000000814', 'https://council-archive.example/2023-hours', 'https://web.archive.org/web/0/hours', '2023 office-hours calendar archive', 'Council calendar', '2026-04-12');

INSERT INTO integrity_flags (id, politician_id, description, status, published) VALUES
 ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000202',
  'Stated "no property-tax increase this term" (At-large forum, 2026-05) — voted YES on the FY27 levy adjustment (2026-06).', 'open', FALSE),
 ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000204',
  'Mailer claims "endorsed by county firefighters" — no such endorsement on file.', 'upheld', TRUE),
 ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000201',
  'Claimed all 2023 district office hours were held — one district session was unverifiable.', 'dismissed', FALSE);

INSERT INTO integrity_flag_citations (integrity_flag_id, citation_id) VALUES
 ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000812'),
 ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000813'),
 ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000814');

INSERT INTO integrity_flag_status_events (integrity_flag_id, status, citation_id, note, recorded_at) VALUES
 ('00000000-0000-4000-8000-000000000901', 'open', '00000000-0000-4000-8000-000000000811', 'System: voting-record contradiction detected at ingestion.', '2026-07-10'),
 ('00000000-0000-4000-8000-000000000902', 'open', '00000000-0000-4000-8000-000000000812', 'User report with mailer scan.', '2026-05-16'),
 ('00000000-0000-4000-8000-000000000902', 'upheld', '00000000-0000-4000-8000-000000000813', 'Upheld after reply window lapsed with no response. Published with evidence attached.', '2026-06-05'),
 ('00000000-0000-4000-8000-000000000903', 'open', NULL, 'User report: one 2023 session unverifiable.', '2026-04-01'),
 ('00000000-0000-4000-8000-000000000903', 'dismissed', '00000000-0000-4000-8000-000000000814', 'Calendar archive located; claim verified. REPLY: "Thank you for checking the record."', '2026-04-12');

-- ── Coding queue: model-suggested, UNCONFIRMED (usable_for_scoring = FALSE) ──
DO $$
DECLARE r jsonb; top uuid; ax uuid; cit uuid; pos uuid;
BEGIN
FOR r IN SELECT * FROM jsonb_array_elements($J$[
 {"pol":"203","topic":"Climate & environment","val":1,"src":"questionnaire","date":"2026-06-15","pub":"VoteRight questionnaire","title":"Late climate answers","stmt":"We should hit the dates we promised, but small landlords need real help complying."},
 {"pol":"204","topic":"Housing affordability","val":-2,"src":"debate_transcript","date":"2026-06-20","pub":"At-large forum 2","title":"Second forum transcript","stmt":"I would repeal the cap outright — full stop."},
 {"pol":"208","topic":"Transit & roads","val":2,"src":"interview","date":"2026-06-25","pub":"Local radio interview","title":"Transit interview","stmt":"BRT build-out is my first budget priority, and I will fund it in year one."}
]$J$::jsonb)
LOOP
  SELECT id INTO top FROM topics WHERE name = r->>'topic';
  SELECT id INTO ax FROM topic_axes WHERE topic_id = top;
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://' || (r->>'pub') || '/p2', 'https://web.archive.org/web/0/p2', r->>'title', r->>'pub', (r->>'date')::date)
   RETURNING id INTO cit;
  INSERT INTO politician_positions (politician_id, topic_id, statement, source_type, citation_id, recorded_at)
   VALUES (('00000000-0000-4000-8000-000000000' || (r->>'pol'))::uuid, top, r->>'stmt', r->>'src', cit, (r->>'date')::timestamptz)
   RETURNING id INTO pos;
  INSERT INTO position_codings (position_id, axis_id, value, coding_method, confirmed_by_human, coder_note)
   VALUES (pos, ax, (r->>'val')::int, 'model_suggested', FALSE, 'model suggestion — awaiting human confirmation');
END LOOP;
END $$;

-- ═══════════════════════════ PHASE 3 SEED ═══════════════════════════
-- One live debate thread (past its seconding threshold) and one proposal still
-- gathering seconds. Seed participants are fictional verified residents.

INSERT INTO users (id, auth_id, display_name, residence_jurisdiction_id, verification_tier) VALUES
 ('00000000-0000-4000-8000-000000000a01', 'seed:a01', 'Marcus J.', 'ocd-division/country:us/state:md/county:montgomery', 'address_verified'),
 ('00000000-0000-4000-8000-000000000a02', 'seed:a02', 'Lena P.', 'ocd-division/country:us/state:md/county:montgomery', 'address_verified'),
 ('00000000-0000-4000-8000-000000000a03', 'seed:a03', 'Sofia R.', 'ocd-division/country:us/state:md/county:montgomery', 'address_verified'),
 ('00000000-0000-4000-8000-000000000a04', 'seed:a04', 'Ted W.', 'ocd-division/country:us/state:md/county:montgomery', 'address_verified'),
 ('00000000-0000-4000-8000-000000000a05', 'seed:a05', 'Ana G.', 'ocd-division/country:us/state:md/county:montgomery', 'address_verified');

INSERT INTO issue_proposals (id, created_by_user_id, jurisdiction_id, topic_id, title, body, second_threshold, status) VALUES
 ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000a01',
  'ocd-division/country:us/state:md/county:montgomery', '00000000-0000-4000-8000-000000000101',
  'Allow duplexes and triplexes within a half-mile of Metro stations',
  'Amend county zoning so that lots currently restricted to single-family homes within a half-mile of a Metro station may also build duplexes and triplexes, subject to existing height limits.',
  3, 'debating'),
 ('00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-000000000a03',
  'ocd-division/country:us/state:md/county:montgomery', '00000000-0000-4000-8000-000000000101',
  'Extend rent stabilization to buildings completed after 2010',
  'Apply the county rent stabilization law to rental buildings that received their use-and-occupancy permit after 2010, closing the newer-building exemption.',
  3, 'seconding');

INSERT INTO seconds (proposal_id, user_id, verification_tier_at_second) VALUES
 ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000a02', 'address_verified'),
 ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000a03', 'address_verified'),
 ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000a04', 'address_verified'),
 ('00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-000000000a05', 'address_verified');

INSERT INTO forum_threads (id, proposal_id, opened_at, closes_at) VALUES
 ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000b01', now() - interval '3 days', now() + interval '7 days');

INSERT INTO arguments (id, thread_id, user_id, side, format, body_text, moderation_status, created_at, agree_count, disagree_count, pass_count) VALUES
 ('00000000-0000-4000-8000-000000000d01', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a01', 'for', 'text',
  'The Planning Board''s own corridor study shows station areas can absorb gentle density without new road load — that''s the whole point of having Metro.', 'approved', now() - interval '3 days', 96, 21, 6),
 ('00000000-0000-4000-8000-000000000d02', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a02', 'for', 'text',
  'I teach at a school two blocks from a station and can''t afford to live within ten miles of it. Housing near transit is who gets to work here.', 'approved', now() - interval '2 days', 71, 15, 4),
 ('00000000-0000-4000-8000-000000000d03', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a03', 'for', 'text',
  'Median first-home prices near stations doubled in a decade while starter-home construction fell to almost nothing.', 'approved', now() - interval '2 days', 41, 12, 3),
 ('00000000-0000-4000-8000-000000000d04', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a04', 'against', 'text',
  'Three of the five school clusters closest to a station are over 120% capacity today. Approve the review money first, then the zoning.', 'approved', now() - interval '1 day', 52, 18, 5),
 ('00000000-0000-4000-8000-000000000d05', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a05', 'neutral_info', 'text',
  'For reference: the current overlay applies to 11 station areas; the Planning Board study covered 8 of them.', 'approved', now() - interval '1 day', 33, 2, 9),
 ('00000000-0000-4000-8000-000000000d06', '00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a02', 'against', 'text',
  'Property taxes near my station went up 30% already — this will price out the seniors on my street.', 'pending', now() - interval '2 hours', 0, 0, 0);

-- citations on the two evidence-backed arguments
DO $$
DECLARE c1 uuid; c2 uuid; c3 uuid;
BEGIN
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://planning.example/corridor-study', 'https://web.archive.org/web/0/corridor', 'Corridor capacity study', 'Planning Board', '2025-10-01') RETURNING id INTO c1;
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://census.example/acs-commute', 'https://web.archive.org/web/0/acs', 'ACS commute data', 'U.S. Census', '2024-09-01') RETURNING id INTO c2;
  INSERT INTO citations (url, archive_url, title, publisher, published_at)
   VALUES ('https://mcps.example/capacity-2026', 'https://web.archive.org/web/0/mcps', 'School capacity report', 'MCPS', '2026-02-01') RETURNING id INTO c3;
  INSERT INTO argument_citations (argument_id, citation_id) VALUES
   ('00000000-0000-4000-8000-000000000d01', c1),
   ('00000000-0000-4000-8000-000000000d01', c2),
   ('00000000-0000-4000-8000-000000000d04', c3);
END $$;

-- agreement votes (private signals) from seed users — enough to make CTQ eligibility real
INSERT INTO argument_agreement_votes (argument_id, user_id, response) VALUES
 ('00000000-0000-4000-8000-000000000d01', '00000000-0000-4000-8000-000000000a05', 'agree'),
 ('00000000-0000-4000-8000-000000000d02', '00000000-0000-4000-8000-000000000a05', 'agree'),
 ('00000000-0000-4000-8000-000000000d04', '00000000-0000-4000-8000-000000000a05', 'disagree'),
 ('00000000-0000-4000-8000-000000000d01', '00000000-0000-4000-8000-000000000a04', 'disagree'),
 ('00000000-0000-4000-8000-000000000d03', '00000000-0000-4000-8000-000000000a04', 'pass');

-- two of the five active participants have called the question
INSERT INTO call_the_question_votes (thread_id, user_id) VALUES
 ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a01'),
 ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000a04');

-- one resolved claim flag for history (the pending argument's tax claim, author marked as opinion)
INSERT INTO argument_claim_flags (argument_id, claim_text, detection_method, algorithm_version, author_response) VALUES
 ('00000000-0000-4000-8000-000000000d06', 'Property taxes near my station went up 30% already', 'model', 'claims-heuristic-v0.1', 'marked_as_opinion');
