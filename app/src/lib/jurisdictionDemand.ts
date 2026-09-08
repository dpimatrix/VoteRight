import { db } from "./db";
import { notifyAdmins } from "./adminNotify";
import { notifyUsers } from "./notifications";

/* Demand-driven jurisdiction provisioning (2026-09-08, owner's idea,
   migration 103). When an address resolves to a real US county the Census
   geocoder recognizes but VoteRight hasn't seeded local detail for yet,
   jurisdictions.ts's jurisdictionForGeography already falls back to that
   state's bare ballot -- this module captures DEMAND for provisioning the
   county properly, entirely without touching the privacy model:

     - Never stores a raw address. The only thing recorded is the Census
       state/county FIPS pair debates.ts's verifyAddress already had in
       hand at the exact moment it learned the county wasn't seeded (see
       jurisdictions.ts's own countyNotYetSeeded comment) -- the same
       category of data (a FIPS code) this project already treats as
       public geographic classification, not personal data, everywhere
       else it routes ballots.
     - One signal per pseudonymous user_id per county, not per raw
       verification attempt -- re-verifying the same address twice from
       the same identity can't inflate demand. Exact same "one signal per
       verified user, count self-corrects" pattern accountability_campaign_
       supports already established; reused rather than reinvented.
     - Admin is alerted once a county crosses the threshold (reuses
       adminNotify.ts, no new alert channel) and sees a live queue of every
       county with at least one signal, each auto-flagged once VoteRight's
       own data shows it's since been seeded (a real jurisdictions row +
       at least one office) -- but nothing auto-notifies the waiting
       residents on that basis alone. An admin still has to look at the
       actual new data and click "Mark as provisioned" against their own
       internal quality bar before anyone gets told their area is ready --
       same "explicit admin action for a consequential state change"
       posture as check-payment reconciliation and mandate certification.
     - Notifying the residents who were waiting reuses notifications.ts's
       existing pseudonymous push/in-app system (the same one CTQ/debate
       notifications already use) -- no email or contact info is ever
       collected for this feature specifically. */

export const DEMAND_THRESHOLD = 12;

interface Locality {
  stateFips: string;
  countyFips: string;
  placeName: string | null;
}

/** Called from debates.ts's verifyAddress right after a resolution lands on
    a county that isn't seeded yet. Best-effort by design (mirrors
    anomalyDetection.ts's flagIfAnomalous and notifications.ts's own
    createNotification) -- a demand-tracking write must never take down a
    real address verification. */
export async function recordJurisdictionDemandSignal(userId: string, locality: Locality): Promise<void> {
  try {
    const insert = await db().query(
      `INSERT INTO jurisdiction_demand_signals (state_fips, county_fips, place_name, user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (state_fips, county_fips, user_id) DO NOTHING
       RETURNING id`,
      [locality.stateFips, locality.countyFips, locality.placeName, userId],
    );
    if (insert.rowCount === 0) return; // this identity already signaled for this county -- no new demand, nothing to recompute
    const { rows } = await db().query(
      `SELECT count(*)::int AS n FROM jurisdiction_demand_signals WHERE state_fips = $1 AND county_fips = $2`,
      [locality.stateFips, locality.countyFips],
    );
    const n = rows[0].n as number;
    // Fires exactly once per county, at the moment it crosses the
    // threshold -- not >= on every subsequent signal, which would re-alert
    // admin every single time someone new verifies in an already-flagged,
    // still-unprovisioned county.
    if (n === DEMAND_THRESHOLD) {
      const label = locality.placeName ? `${locality.placeName} (county FIPS ${locality.stateFips}${locality.countyFips})` : `county FIPS ${locality.stateFips}${locality.countyFips}`;
      await notifyAdmins(
        "jurisdiction_demand",
        "A county just crossed the provisioning-demand threshold",
        `${DEMAND_THRESHOLD} distinct residents have now verified an address in ${label}, which VoteRight hasn't seeded local jurisdiction detail for yet. Review it in /admin/jurisdiction-demand.`,
      );
    }
  } catch (e) {
    console.error(`jurisdiction demand signal failed for county ${locality.stateFips}${locality.countyFips}: ${(e as Error).message}`);
  }
}

export interface JurisdictionDemandRow {
  stateFips: string;
  countyFips: string;
  placeNames: string[]; // distinct incorporated places seen among this county's signals, for admin context -- county-level is still the provisioning unit
  signalCount: number;
  firstSignalAt: string;
  looksProvisioned: boolean; // a real county-level jurisdiction row now exists with at least one office -- doesn't mean admin has reviewed it yet
}

/** Every county with at least one demand signal, most-active first --
    admin visibility starts building from the FIRST signal, not just once
    the threshold is crossed, mirroring adminPendingCheckQueue's own
    "show the whole queue, not just the urgent slice" convention. */
export async function adminJurisdictionDemandQueue(): Promise<JurisdictionDemandRow[]> {
  const { rows } = await db().query(
    `SELECT s.state_fips, s.county_fips,
            array_remove(array_agg(DISTINCT s.place_name), NULL) AS place_names,
            count(*)::int AS signal_count,
            min(s.created_at) AS first_signal_at,
            EXISTS (
              SELECT 1 FROM jurisdictions j
                JOIN offices o ON o.jurisdiction_id = j.ocd_id
               WHERE j.level = 'county' AND j.state_fips = s.state_fips AND j.county_fips = s.county_fips
            ) AS looks_provisioned
       FROM jurisdiction_demand_signals s
      GROUP BY s.state_fips, s.county_fips
      ORDER BY signal_count DESC, first_signal_at ASC`,
  );
  return rows.map((r) => ({
    stateFips: r.state_fips,
    countyFips: r.county_fips,
    placeNames: r.place_names as string[],
    signalCount: r.signal_count,
    firstSignalAt: r.first_signal_at,
    looksProvisioned: r.looks_provisioned,
  }));
}

/** Admin's explicit confirmation that a county has actually been seeded to
    VoteRight's own standards -- notifies every distinct resident who
    signaled demand for it (best-effort, same posture as every other
    notification path), then deletes the tracking rows per the owner's own
    spec ("remove that tracking from admin"). Silently a no-op if the
    county has no signals at all (already provisioned+cleared, or a typo'd
    FIPS pair) rather than erroring -- there's nothing destructive to guard
    against either way. */
export async function adminMarkJurisdictionProvisioned(stateFips: string, countyFips: string): Promise<void> {
  const { rows } = await db().query(
    `SELECT DISTINCT user_id FROM jurisdiction_demand_signals WHERE state_fips = $1 AND county_fips = $2`,
    [stateFips, countyFips],
  );
  if (rows.length === 0) return;
  const userIds = rows.map((r) => r.user_id as string);
  await notifyUsers(userIds, "jurisdiction_provisioned", {
    detail: "Your area now has its own local ballot detail — check back on your ballot to see it.",
  });
  await db().query(`DELETE FROM jurisdiction_demand_signals WHERE state_fips = $1 AND county_fips = $2`, [stateFips, countyFips]);
}
