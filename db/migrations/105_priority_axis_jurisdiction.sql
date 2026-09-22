-- Jurisdiction-scope priority axes (2026-09-22, owner request).
--
-- Real gap found live: topicsWithAxes() shows every published axis to every
-- resident nationwide, with zero jurisdiction filtering -- unlike the
-- ballot, Matches, and accountability pathways, which are all genuinely
-- scoped to a resident's own jurisdiction. The 6 existing axes are
-- Montgomery-County-specific in wording (MCPS, Ride On, "the county"), so a
-- resident anywhere outside Montgomery County has always been shown
-- priority questions meaningless to them -- invisible from a Montgomery
-- County resident's own vantage point, since those axes genuinely do apply
-- there, which is exactly why this went unnoticed until now.
--
-- NULL jurisdiction_id = nationwide (applies to every resident, e.g. the
-- federal axes about to be drafted). A real jurisdiction_id scopes an axis
-- to residents whose OWN jurisdiction stack includes it -- a Gaithersburg
-- resident's stack is Gaithersburg -> Montgomery County -> Maryland ->
-- United States, so a Montgomery-County-scoped axis reaches them via that
-- ancestor walk, the same recursive-CTE pattern ballotForJurisdiction()
-- already uses for offices.
ALTER TABLE topic_axes ADD COLUMN jurisdiction_id TEXT REFERENCES jurisdictions(ocd_id);

-- The 6 existing axes are Montgomery-specific by content, not generically
-- "any county" -- MCPS is Montgomery County Public Schools specifically,
-- Ride On is Montgomery's own bus system. Tagged to that one real
-- jurisdiction, not left nationwide (which would keep showing them to
-- every resident, the exact bug this migration closes) and not left NULL
-- by omission.
UPDATE topic_axes SET jurisdiction_id = 'ocd-division/country:us/state:md/county:montgomery'
 WHERE jurisdiction_id IS NULL;
