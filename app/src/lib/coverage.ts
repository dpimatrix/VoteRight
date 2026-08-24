import { db } from "./db";
import { CURRENT_CYCLE_YEAR } from "./jurisdictions";

/* Race/candidate coverage tracking (docs/BACKLOG.md, 2026-08-23 entry).
   Two genuinely different problems, kept separate per that entry's own
   reasoning:

   1. Detection -- pendingCoverageGaps() below -- IS automatable: a plain
      LEFT JOIN of elected offices against races for the current cycle,
      scoped to jurisdictions where at least one resident is actually
      address_verified (an office nobody has verified into isn't costing
      anyone a real gap yet). This is what closed the real gap that
      motivated this whole entry: Montgomery County Clerk of the Circuit
      Court was in scope, just never got a races row, and was only caught
      because someone happened to notice during manual testing.

   2. Sourcing is NOT automatable the same way -- unlike officeholder
      rosters (OpenStates/Congress.gov give one consistent nationwide API),
      candidate-filing data has no equivalent; every state (often every
      county) runs its own election system. This file only surfaces WHAT's
      missing and, via pending_seat_views, WHERE real demand is -- closing
      a specific gap stays a human research task per jurisdiction. */

export interface PendingSeat {
  officeId: string;
  title: string;
  jurisdictionName: string;
  level: string;
  viewerCount: number;
}

/** Every elected office with no races row for the current cycle, in any
    jurisdiction where at least one resident is address_verified (or
    better) -- ordered by how many distinct verified residents have
    actually viewed the seat as Pending on their own ballot (see
    logPendingSeatViews below), so the seats real people are waiting on
    surface first, not just whatever happens to sort alphabetically. */
export async function pendingCoverageGaps(): Promise<PendingSeat[]> {
  const { rows } = await db().query(
    `WITH RECURSIVE resident_jurisdictions AS (
       SELECT DISTINCT residence_jurisdiction_id AS ocd_id
         FROM users
        WHERE verification_tier <> 'unverified' AND residence_jurisdiction_id IS NOT NULL
       UNION
       SELECT j.parent_ocd_id
         FROM jurisdictions j
         JOIN resident_jurisdictions rj ON j.ocd_id = rj.ocd_id
        WHERE j.parent_ocd_id IS NOT NULL
     )
     SELECT o.id AS office_id, o.title, j.name AS jurisdiction_name, o.level,
            COUNT(DISTINCT psv.user_id) AS viewer_count
       FROM offices o
       JOIN jurisdictions j ON j.ocd_id = o.jurisdiction_id
       LEFT JOIN pending_seat_views psv ON psv.office_id = o.id
      WHERE o.is_elected
        AND o.jurisdiction_id IN (SELECT ocd_id FROM resident_jurisdictions)
        AND NOT EXISTS (
          SELECT 1 FROM races r
             JOIN election_cycles ec ON ec.id = r.election_cycle_id
            WHERE r.office_id = o.id AND EXTRACT(YEAR FROM ec.election_date) = $1
        )
      GROUP BY o.id, o.title, j.name, o.level
      ORDER BY viewer_count DESC, j.name, o.title`,
    [CURRENT_CYCLE_YEAR],
  );
  return rows.map((r) => ({
    officeId: r.office_id,
    title: r.title,
    jurisdictionName: r.jurisdiction_name,
    level: r.level,
    viewerCount: Number(r.viewer_count),
  }));
}

/** Fire-and-forget log of which Pending seats a real, address-verified
    resident's own ballot actually showed them today -- called once per
    Ballot page render (see app/page.tsx), never for a visitor browsing
    someone else's jurisdiction (visited lens) or an anonymous/unverified
    user (both cases pass an empty officeIds list from the caller, but the
    guard lives here too since this function has no other caller to trust
    for that). ON CONFLICT DO NOTHING -- repeat same-day visits don't
    inflate the signal; distinct days and distinct residents do. */
export async function logPendingSeatViews(userId: string, officeIds: string[]): Promise<void> {
  if (officeIds.length === 0) return;
  await db().query(
    `INSERT INTO pending_seat_views (office_id, user_id)
     SELECT unnest($1::uuid[]), $2
     ON CONFLICT DO NOTHING`,
    [officeIds, userId],
  );
}
