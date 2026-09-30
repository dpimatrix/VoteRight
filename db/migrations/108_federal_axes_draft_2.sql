-- Second batch of draft federal/national priority axes (2026-09-30, owner
-- request, held deliberately until the Priorities view's level-grouping
-- work landed first -- see migration 106 and the level-grouping commit
-- for that sequencing).
--
-- Owner observation confirmed well-founded: the original 8 federal axes
-- (migration 106) leave real, significant areas of national politics
-- completely unrepresented -- gun policy, criminal justice, voting
-- rights, labor, higher education, drug policy, and trade all have real,
-- recurring, standalone Congressional roll calls and none were covered.
-- Same fit-analysis discipline as migration 106: each axis below is
-- grounded in a real recurring vote category, not just a broad topic
-- area.
--
-- 1 reuses an existing topic (Public safety, already used by the
-- Montgomery-scoped police_staffing axis -- gun policy is thematically
-- public-safety at the federal level too); 6 need new topics with no
-- existing analogue (Criminal justice, Voting & elections, Labor &
-- wages, Higher education, Drug policy, Trade).
--
-- DRAFTED BY CLAUDE, NOT PUBLISHED -- same posture as migration 106:
-- status='draft', invisible to every resident and to both position-
-- coding tools until a real admin reviews and publishes each one via
-- /admin/priority-axes. created_by_admin discloses the AI provenance.
-- jurisdiction_id left NULL (nationwide/federal), the same semantics
-- migration 105 established for that value, now also carrying the
-- "federal" level label the Priorities view's level-grouping work
-- (2026-09-30) gives it.

INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000205', 'Criminal justice'),
 ('00000000-0000-4000-8000-000000000206', 'Voting & elections'),
 ('00000000-0000-4000-8000-000000000207', 'Labor & wages'),
 ('00000000-0000-4000-8000-000000000208', 'Higher education'),
 ('00000000-0000-4000-8000-000000000209', 'Drug policy'),
 ('00000000-0000-4000-8000-000000000210', 'Trade');

INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 ('00000000-0000-4000-8000-000000000219', '00000000-0000-4000-8000-000000000105', 'gun_background_checks',
  'Should Congress expand background-check requirements for gun purchases, or protect current purchasing processes from new restrictions?',
  'Protect current purchasing process', 'Expand background checks', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000220', '00000000-0000-4000-8000-000000000205', 'federal_criminal_justice_reform',
  'Should Congress expand federal criminal-justice reform (sentencing reform, policing oversight), or maintain current federal sentencing/policing standards?',
  'Maintain current standards', 'Expand reform', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000206', 'federal_voting_access_standards',
  'Should Congress set new federal standards expanding voting access, or leave election administration primarily to the states?',
  'Leave to the states', 'Expand federal voting-access standards', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000222', '00000000-0000-4000-8000-000000000207', 'federal_minimum_wage',
  'Should Congress raise the federal minimum wage, or leave current wage-setting primarily to states/employers?',
  'Leave to states/employers', 'Raise the federal minimum wage', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000223', '00000000-0000-4000-8000-000000000208', 'federal_student_loan_relief',
  'Should the federal government expand student loan forgiveness/relief, or hold borrowers to current repayment terms?',
  'Hold to current repayment terms', 'Expand forgiveness/relief', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000224', '00000000-0000-4000-8000-000000000209', 'federal_cannabis_policy',
  'Should Congress ease federal restrictions on cannabis (rescheduling/legalization), or maintain current federal drug-scheduling law?',
  'Maintain current federal law', 'Ease federal restrictions', 'draft', 'Claude, pending human review (2026-09-30)', NULL),
 ('00000000-0000-4000-8000-000000000225', '00000000-0000-4000-8000-000000000210', 'federal_trade_tariff_policy',
  'Should Congress limit executive tariff authority and expand free trade agreements, or preserve broad tariff authority to protect domestic industries?',
  'Preserve tariff authority', 'Limit tariffs / expand free trade', 'draft', 'Claude, pending human review (2026-09-30)', NULL);
