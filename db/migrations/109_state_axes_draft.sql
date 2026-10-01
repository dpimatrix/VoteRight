-- First batch of draft STATE-level priority axes (2026-09-30, owner request:
-- "Draft state-level priority axes next").
--
-- SOURCING METHOD (disclosed, same transparency standard as migrations 106/
-- 108): OpenStates' own bill `subject` tagging is unreliable for both states
-- -- verified live querying v3.openstates.org/bills before drafting anything
-- here: Maryland's subject field returns only the single junk value 'A' on
-- every bill sampled (including a 20-bill pull scoped to the live 2026
-- session), and Virginia's returns an empty array on every bill sampled, so
-- subject-tag clustering was not usable as a sourcing method. Instead,
-- pulled real voted bills (votes.length > 0, i.e. an actual floor roll call
-- happened, not just a bill that was filed and died in committee) from each
-- state's most recent COMPLETED regular session (MD 2025, VA 2025 -- VA's
-- 2026 activity window was between sessions as of this date, so "latest
-- action" there surfaced zero voted bills), and read real bill titles
-- directly for recurring themes, the same "grounded in a real recurring
-- vote category" discipline as the federal batches, just without a subject
-- taxonomy to lean on.
--
-- jurisdiction_id scoping note: unlike the federal axes (jurisdiction_id
-- NULL = nationwide), a genuine STATE-level axis must carry a REAL
-- jurisdiction_id pointing at that state's own jurisdictions row (level=
-- 'state') -- NULL is reserved for federal/nationwide by the level-grouping
-- logic (`COALESCE(aj.level, 'federal')` in topicsWithAxes()), so a NULL
-- axis would mislabel itself "Federal" in the grouped Priorities view.
-- Verified live before drafting: topicsWithAxes()'s and axesForCoding()'s
-- existing ancestor-walk CTEs already handle this correctly with no code
-- changes needed -- a state-scoped axis reaches every resident whose
-- jurisdiction ancestor chain includes that state (so e.g. Montgomery County
-- residents see Maryland-scoped axes, the same walk that already lets them
-- see Montgomery-County-scoped ones), and openstates-legislature.mjs
-- already anchors every MD/VA state legislator's own office directly at the
-- state jurisdiction_id with level='state' (confirmed by reading that
-- ingester), so axesForCoding() offers these axes correctly when staff code
-- a state delegate/senator's real recorded vote.
--
-- Because topic_axes has UNIQUE(topic_id, key), the same conceptual
-- question in two different states needs two rows (distinct key, same
-- topic_id) rather than one NULL-scoped row -- done below everywhere real
-- evidence was found in BOTH states. Three axes are scoped to Virginia only
-- (data-center/energy siting, synthetic-media/deepfake regulation) and two
-- to Maryland only (immigration-enforcement cooperation, prescription-drug
-- affordability) because that is honestly where the real recurring votes
-- were found in this pass -- not forced into artificial symmetry.
--
-- DRAFTED BY CLAUDE, NOT PUBLISHED -- same posture as migrations 106/108:
-- status='draft', invisible to every resident and to both position-coding
-- tools until a real admin reviews and publishes each one via
-- /admin/priority-axes. created_by_admin discloses the AI provenance.

INSERT INTO topics (id, name) VALUES
 ('00000000-0000-4000-8000-000000000231', 'Housing & land use'),
 ('00000000-0000-4000-8000-000000000232', 'Data privacy'),
 ('00000000-0000-4000-8000-000000000233', 'Energy & utilities'),
 ('00000000-0000-4000-8000-000000000234', 'Technology & AI regulation'),
 ('00000000-0000-4000-8000-000000000235', 'Prescription drug costs');

INSERT INTO topic_axes (id, topic_id, key, question, negative_pole, positive_pole, status, created_by_admin, jurisdiction_id) VALUES
 -- Evidence: MD "Election Law - Polling Place Procedures - Voting by Elderly
 -- Voters and Voters With Disabilities (Accessible and Expedited Voting Act
 -- of Maryland)", "Election Law - Election Judges - Compensation",
 -- "Election Law - Petitions and Ballot Questions - Contents, Plain
 -- Language Requirement, and Procedures", "Election Law - Special
 -- Elections" -- 4 independent real roll-called election-law bills in one
 -- session. Reuses the "Voting & elections" topic migration 108 created
 -- (that one is federal-scoped; these are state-scoped, distinct keys).
 ('00000000-0000-4000-8000-000000000236', '00000000-0000-4000-8000-000000000206', 'md_election_administration',
  'Should Maryland expand voter-access provisions in election administration (early voting, accessible/expedited voting, plain-language ballot questions), or keep current election-administration rules as they are?',
  'Keep current rules', 'Expand voter-access provisions', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 -- Evidence: VA "Voter registration; registration of DMV customers, updates
 -- to existing registration.", "Presidential primaries; ranked choice
 -- voting, effective clause." -- 2 independent real roll-called bills.
 ('00000000-0000-4000-8000-000000000237', '00000000-0000-4000-8000-000000000206', 'va_election_administration',
  'Should Virginia expand voter-registration and voting-access tools (DMV-linked registration, ranked-choice voting), or keep current election-administration rules as they are?',
  'Keep current rules', 'Expand registration/voting-access tools', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),

 -- Evidence: MD "Correctional Services and Criminal Procedure - Immigration
 -- Enforcement - Prohibitions (Community Trust Act)" and, independently,
 -- "Enforcement of Federal Immigration Law - Restrictions on Access to
 -- Information" -- 2 independent real roll-called bills, both about
 -- state/local cooperation with federal immigration enforcement. Reuses the
 -- "Public safety" topic (same rationale migration 108 used to fold federal
 -- gun-background-checks into it).
 ('00000000-0000-4000-8000-000000000238', '00000000-0000-4000-8000-000000000105', 'md_immigration_enforcement_cooperation',
  'Should Maryland restrict state and local cooperation with federal immigration enforcement (limiting information-sharing, as in the Community Trust Act), or maintain/expand that cooperation?',
  'Maintain/expand cooperation', 'Restrict cooperation', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),

 -- Evidence: MD "Data Privacy - Consumer Data, Public Records, and Message
 -- Switching System (Data Privacy Act)", confirmed again independently as
 -- "Enforcement of Federal Immigration Law ... (Maryland Data Privacy Act)"
 -- (a renamed/chaptered version of the same bill) -- a real, substantial
 -- state data-privacy statute.
 ('00000000-0000-4000-8000-000000000239', '00000000-0000-4000-8000-000000000232', 'md_consumer_data_privacy',
  'Should Maryland expand consumer data-privacy protections and restrictions on data collection/sharing (as in the Maryland Data Privacy Act), or keep current, lighter data-privacy requirements on businesses?',
  'Keep current, lighter requirements', 'Expand data-privacy protections', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 -- Evidence: VA "Consumer Data Protection Act; protections for children."
 ('00000000-0000-4000-8000-000000000240', '00000000-0000-4000-8000-000000000232', 'va_consumer_data_privacy',
  'Should Virginia expand consumer data-privacy protections, including for children (as in the Consumer Data Protection Act), or keep current data-privacy requirements on businesses as they are?',
  'Keep current requirements', 'Expand data-privacy protections', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),

 -- Evidence: MD "Land Use - Permitting - Development Rights (Maryland
 -- Housing Certainty Act)".
 ('00000000-0000-4000-8000-000000000241', '00000000-0000-4000-8000-000000000231', 'md_housing_zoning_preemption',
  'Should Maryland law make it easier to build housing by limiting local zoning/permitting barriers (as in the Maryland Housing Certainty Act), or preserve local governments'' current zoning and permitting authority?',
  'Preserve local zoning/permitting authority', 'Limit local barriers to ease housing development', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md'),
 -- Evidence: VA "Affordable housing; local zoning ordinance authority,
 -- comprehensive plan.", "Zoning; enhanced civil penalties, certain
 -- residential violations.", "Faith in Housing for the Commonwealth Act;
 -- construction of affordable housing." -- 3 independent real bills.
 ('00000000-0000-4000-8000-000000000242', '00000000-0000-4000-8000-000000000231', 'va_housing_zoning_preemption',
  'Should Virginia expand state authority to override local zoning barriers to affordable-housing construction, or preserve localities'' current zoning authority?',
  'Preserve local zoning authority', 'Expand state authority to ease housing construction', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),

 -- Evidence: VA "Virtual power plant pilot program; each Phase II Utility
 -- shall petition SCC...", "Data centers; site assessment for high energy
 -- use facility.", "Siting of data centers; impacts on resources and
 -- historically significant sites.", "Electric utilities; electric
 -- distribution infrastructure serving data centers." -- 4 independent real
 -- bills, reflecting Virginia's real, well-documented position as the
 -- single largest data-center hub in the country. No comparable MD evidence
 -- found in this pass -- Virginia-only by the actual evidence, not forced.
 ('00000000-0000-4000-8000-000000000243', '00000000-0000-4000-8000-000000000233', 'va_data_center_energy_siting',
  'Should Virginia impose new state oversight or limits on data-center siting and the electric infrastructure built to serve them, or continue allowing data-center development and utility buildout largely as it is now?',
  'Continue largely as-is', 'Impose new state oversight/limits', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),

 -- Evidence: VA "Synthetic digital content; definition, penalty, report,
 -- effective clause.", "Synthetic media; expands applicability of
 -- provisions related to defamation, etc., penalty.", "Synthetic media; use
 -- in furtherance of crimes involving fraud, etc., report." -- 3
 -- independent real bills in one session on the same emerging theme
 -- (AI-generated deepfakes). MD's only AI-related bill found in this pass
 -- was an education-guidelines bill with a different angle (classroom use,
 -- not deepfake harms), not a close enough match to scope MD here honestly.
 ('00000000-0000-4000-8000-000000000244', '00000000-0000-4000-8000-000000000234', 'va_synthetic_media_regulation',
  'Should Virginia expand criminal/civil penalties and restrictions on AI-generated synthetic media (deepfakes used for fraud, defamation, or election interference), or rely on existing law without new synthetic-media-specific rules?',
  'Rely on existing law, no new synthetic-media rules', 'Expand synthetic-media-specific penalties/restrictions', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:va'),

 -- Evidence: MD "Prescription Drug Affordability Board - Authority and
 -- Stakeholder Council Membership (Lowering Prescription Drug Costs for All
 -- Marylanders Now Act)" -- a real, substantial statute (Maryland's PDAB is
 -- an established board, this bill expands its authority), part of a
 -- well-documented multi-state policy movement; no comparable VA bill found
 -- in this pass, so Maryland-only by the actual evidence.
 ('00000000-0000-4000-8000-000000000245', '00000000-0000-4000-8000-000000000235', 'md_prescription_drug_affordability',
  'Should Maryland strengthen the Prescription Drug Affordability Board''s authority to cap or limit drug costs (as in the Lowering Prescription Drug Costs for All Marylanders Now Act), or limit the Board''s authority and rely more on market pricing?',
  'Limit Board authority, rely on market pricing', 'Strengthen Board''s cost-capping authority', 'draft', 'Claude, pending human review (2026-09-30)', 'ocd-division/country:us/state:md');
