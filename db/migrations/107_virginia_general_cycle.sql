-- Adds the missing 2026 Virginia General election_cycles row (owner
-- request, 2026-09-28, scoping the federal-only Virginia candidate-filing
-- ingester). Maryland's equivalent row ('2026 Maryland General') has
-- existed since the original seed; Virginia's never did, since no
-- VA-specific races/candidacies work had been done yet. Date confirmed
-- live against Virginia's own Department of Elections and Ballotpedia:
-- the 2026 Virginia general election is November 3, 2026 (U.S. Senate +
-- all 11 U.S. House seats + one special House of Delegates election +
-- locals -- Virginia's own state legislature/executive aren't up again
-- until 2027, so this ingester is deliberately federal-only for now).
INSERT INTO election_cycles (id, name, election_date, election_type, commentary_promotion_blackout_days) VALUES
 ('00000000-0000-4000-8000-000000000302', '2026 Virginia General', '2026-11-03', 'general', 30);
