-- D1 CUTOVER (docs/DATA-OPS.md §0) — DESTRUCTIVE, run exactly once against the
-- production database, immediately followed by seed.prod.sql and
-- seed.roster-2026.sql:
--
--   psql "$NEON_URL" -f db/cutover-d1.sql
--   psql "$NEON_URL" -f db/seed.prod.sql
--   psql "$NEON_URL" -f db/seed.roster-2026.sql
--
-- Empties every data table (fictional pilot content) while preserving the
-- schema and the schema_migrations ledger. After this, production contains
-- real structure + real people only; db/seed.sql (fictional) is dev-only.

TRUNCATE
  jurisdictions, politicians, offices, election_cycles, races, race_incumbents,
  candidacies, topics, users, voter_priorities, citations, office_terms,
  politician_positions, topic_axes, position_codings, promises,
  promise_status_events, voting_records, independent_expenditure_committees,
  independent_expenditures, campaign_communications, endorsing_organizations,
  endorsements, commentator_inclusion_rules, commentators,
  commentator_status_events, commentator_qualifications, commentator_pieces,
  commentary_links, alignment_scores, integrity_flags,
  integrity_flag_status_events, integrity_flag_citations,
  accountability_pathways, accountability_campaigns,
  accountability_campaign_supports, issue_proposals, seconds,
  proposal_amendments, amendment_seconds, forum_threads,
  call_the_question_votes, arguments, argument_citations, argument_ratings,
  argument_clusters, argument_agreement_votes, opinion_clusters,
  argument_claim_flags, ai_debate_runs, referenda, referendum_ballot_tokens,
  referendum_ballots, voter_mandates, mandate_commitments,
  verification_records, privacy_requests
CASCADE;
