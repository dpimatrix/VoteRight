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
    if (n < DEMAND_THRESHOLD) return;
    // Real bug found on self-review (2026-09-08): this used to check
    // n === DEMAND_THRESHOLD, on the theory that a county crosses the line
    // exactly once and this fires exactly then. True under sequential
    // execution, but this function isn't -- two verifications for the SAME
    // still-unseeded county landing close together (two separate,
    // un-transactioned INSERT-then-SELECT round trips) can both commit
    // their INSERT before either SELECT runs, so the count can jump
    // straight from 11 to 13 without either caller ever observing exactly
    // 12 -- silently skipping the one alert this whole feature exists to
    // send, with no way to recover short of a 13th signal arriving to
    // trigger it by coincidence.
    //
    // Switching the comparison to >= alone would trade that bug for a
    // worse one: EVERY subsequent signal for an already-flagged,
    // still-unprovisioned county would re-alert admin forever, not just
    // once in a rare race window. Neither a bare === nor a bare >= is
    // actually correct here.
    //
    // The real fix is a dedicated, race-free "have we alerted admin for
    // this county yet" gate, not a fancier read of the count: attempt to
    // claim it via a PRIMARY KEY insert. Postgres guarantees at most one
    // concurrent caller ever wins that INSERT for a given (state, county)
    // pair -- that's the one, and only, call that sends the alert, no
    // matter how many callers observe n >= threshold at once or how many
    // more arrive after it's already claimed.
    const claim = await db().query(
      `INSERT INTO jurisdiction_demand_alerts_sent (state_fips, county_fips) VALUES ($1, $2)
       ON CONFLICT (state_fips, county_fips) DO NOTHING
       RETURNING state_fips`,
      [locality.stateFips, locality.countyFips],
    );
    if (claim.rowCount === 0) return; // already alerted for this county -- not this call's job
    const label = locality.placeName ? `${locality.placeName} (county FIPS ${locality.stateFips}${locality.countyFips})` : `county FIPS ${locality.stateFips}${locality.countyFips}`;
    await notifyAdmins(
      "jurisdiction_demand",
      "A county just crossed the provisioning-demand threshold",
      `${DEMAND_THRESHOLD} distinct residents have now verified an address in ${label}, which VoteRight hasn't seeded local jurisdiction detail for yet. Review it in /admin/jurisdiction-demand.`,
    );
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

// KNOWN, ACCEPTED GAP (found on regression review, 2026-09-08, deliberately
// not changed): jurisdictionForGeography's countyNotYetSeeded flips to
// false the moment a bare `jurisdictions` row exists, before this row's own
// looksProvisioned (which also requires an office) would agree the county
// is actually usable -- if a county is provisioned in two steps (row, then
// offices added later), signal collection stops slightly before
// looksProvisioned would. Two possible fixes were considered and rejected:
// loosening looksProvisioned to match would risk an admin clicking "Mark as
// provisioned" on a county whose offices genuinely aren't populated yet;
// tightening jurisdictionForGeography's own matching query to require an
// office has a much wider blast radius (it's the core ballot-routing
// function every resident's verification goes through, not just this
// admin-only queue) and can't be safely verified against real production
// jurisdiction data from here. The gap only matters during the narrow
// window between those two seeding steps, for a resident who happens to
// verify in exactly that window -- accepted as a real but low-frequency
// edge case rather than risk either fix.

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
  // DELETE...RETURNING, not SELECT then a separate DELETE (real race found
  // on regression review, 2026-09-08): those were two independent
  // round trips, so a signal INSERTed in the gap between them -- reachable
  // via the "misclick" case this function's own label-fallback comment
  // below already anticipates, an admin clicking Mark as provisioned
  // before the real jurisdictions row exists yet, county_not_yet_seeded
  // still true for anyone verifying at that exact moment -- got silently
  // deleted by the second query without its submitter ever being in the
  // notify list from the first. One atomic statement closes the window
  // entirely: whatever this DELETE actually removes IS, by construction,
  // the exact and only set of people who need notifying.
  const { rows } = await db().query(
    `DELETE FROM jurisdiction_demand_signals WHERE state_fips = $1 AND county_fips = $2 RETURNING user_id`,
    [stateFips, countyFips],
  );
  if (rows.length === 0) return;
  // No dedup needed -- UNIQUE (state_fips, county_fips, user_id) below
  // already guarantees at most one row per user for this county.
  const userIds = rows.map((r) => r.user_id as string);
  // Real bug found on self-review (2026-09-08): this used to be a
  // hardcoded English sentence in `detail`, which notifications/page.tsx
  // (both platforms) renders verbatim with NO i18n pass -- unlike the
  // headline above it (notif_jurisdiction_provisioned), which IS
  // translated per notifications.ts's own established convention. A
  // Spanish-reading resident would see the correctly-translated headline
  // immediately followed by an untranslated English sentence, breaking
  // the bilingual consistency this app maintains everywhere else. Fixed
  // by using the jurisdiction's own proper name instead of a boilerplate
  // sentence -- a place name doesn't need translating either way, the
  // same reasoning notifyUsers' existing detail usage for a reviewer's
  // freeform note already relies on (that one truly can't be translated;
  // this one just never should have been English prose in the first
  // place). Falls back to the bare FIPS pair only if this ever runs
  // before the jurisdiction row actually exists (a misclick -- provisioned
  // clicked before the real seeding finished) -- also language-neutral.
  const jur = await db().query(`SELECT name FROM jurisdictions WHERE level = 'county' AND state_fips = $1 AND county_fips = $2`, [stateFips, countyFips]);
  const label = (jur.rows[0]?.name as string | undefined) ?? `FIPS ${stateFips}${countyFips}`;
  await notifyUsers(userIds, "jurisdiction_provisioned", { detail: label });
  // Signal rows themselves are already gone -- removed atomically above,
  // not here.
  // Also clears the admin-alert claim (see recordJurisdictionDemandSignal's
  // own comment) -- without this, a county that somehow needs re-tracking
  // later (data correction, a jurisdiction row removed by mistake and
  // re-added) would silently never re-alert admin even after 12 fresh
  // signals, since the claim row from this round would still be sitting
  // there from before.
  await db().query(`DELETE FROM jurisdiction_demand_alerts_sent WHERE state_fips = $1 AND county_fips = $2`, [stateFips, countyFips]);
}
