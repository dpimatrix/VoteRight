-- Draft federal/national priority axes (2026-09-22, owner request following
-- migration 105's jurisdiction-scoping work).
--
-- None of the 6 existing axes fit a federal bill -- each is worded around
-- something literally county-specific with no federal equivalent
-- (rent_stabilization is Montgomery's own rent-cap law; bus_network_expansion
-- names Ride On, Montgomery's own bus system; mcps_full_funding names MCPS,
-- Montgomery's own school system; property_tax_line is about *property* tax,
-- and there is no federal property tax at all). Congress needs its own axis
-- set, grounded in vote categories that actually recur as standalone
-- Congressional roll calls: appropriations/spending, tax policy, immigration,
-- health coverage, gun/abortion policy, defense authorization, etc.
--
-- DRAFTED BY CLAUDE, NOT PUBLISHED. Inserted at status = 'draft' (migration
-- 092's draft -> in_review -> published state machine) -- invisible to every
-- resident and to the /admin/positions coding queue until a real admin
-- reviews and publishes each one via /admin/priority-axes, same as any
-- staff-drafted axis. created_by_admin discloses the AI provenance rather
-- than presenting this as anonymous "seeded" content indistinguishable from
-- the original human-authored county axes (same disclosure discipline
-- CODING-STANDARDS.md already requires of model-suggested position codings).
--
-- jurisdiction_id left NULL (nationwide) on all 8 -- a federal axis applies
-- to every resident regardless of state/county, the same semantics NULL
-- already carries after migration 105.
--
-- 4 reuse existing topic categories (Climate & environment, Taxes & budget,
-- Transit & roads, Public schools) where a real federal analog exists; 4
-- need new topics with no county-level equivalent at all (Immigration,
-- Health care, Reproductive rights, Foreign policy & defense).

INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000201', 'Immigration'),
 ('00000000-0000-4000-8000-000000000202', 'Health care'),
 ('00000000-0000-4000-8000-000000000203', 'Reproductive rights'),
 ('00000000-0000-4000-8000-000000000204', 'Foreign policy & defense');

INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000104', 'clean_energy_transition',
  'Should the federal government expand incentives for clean energy and emissions reductions, or prioritize traditional energy production and reduced regulation?',
  'Prioritize traditional energy production', 'Expand clean-energy incentives', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000212', '00000000-0000-4000-8000-000000000106', 'federal_income_tax_level',
  'Should federal income tax rates be cut, or kept at current levels/raised on higher incomes?',
  'Cut broadly', 'Keep or raise on higher incomes', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000213', '00000000-0000-4000-8000-000000000102', 'federal_transit_infrastructure_funding',
  'Should federal funding for public transit and infrastructure increase?',
  'Reduce or hold funding', 'Increase funding', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000214', '00000000-0000-4000-8000-000000000103', 'federal_k12_funding',
  'Should federal funding for K-12 public schools (Title I, special education) increase?',
  'Reduce or hold funding', 'Increase funding', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000215', '00000000-0000-4000-8000-000000000201', 'immigration_legal_pathways',
  'Should Congress expand legal pathways to citizenship/status for undocumented immigrants, or prioritize border security and enforcement funding?',
  'Prioritize enforcement', 'Expand legal pathways', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000216', '00000000-0000-4000-8000-000000000202', 'federal_health_coverage_role',
  'Should the federal government expand public health coverage (ACA subsidies, Medicaid), or reduce its role and rely more on private markets?',
  'Reduce federal role', 'Expand coverage', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000217', '00000000-0000-4000-8000-000000000203', 'federal_abortion_access',
  'Should Congress codify federal protections for abortion access, or restrict abortion access at the federal level?',
  'Restrict abortion access', 'Codify abortion-access protections', 'draft', 'Claude, pending human review (2026-09-22)', NULL),
 ('00000000-0000-4000-8000-000000000218', '00000000-0000-4000-8000-000000000204', 'defense_spending_level',
  'Should federal defense/military spending increase?',
  'Reduce spending', 'Increase spending', 'draft', 'Claude, pending human review (2026-09-22)', NULL);
