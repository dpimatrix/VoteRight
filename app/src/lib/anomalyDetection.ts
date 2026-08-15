/* Sybil/coordinated-manipulation detection (ARCHITECTURE.md §9; migration
   084's header has the full rationale -- confirmed live 2026-08-15 that
   address_verified alone has zero velocity or geographic check behind it
   anywhere in this codebase, and the only "anomaly" system that actually
   exists (user_key_events) protects against a stolen signing key, a
   different problem entirely).

   Flags for human review, NEVER blocks. A shared IP (a campus, a library,
   an office) can legitimately produce many real distinct voters in a short
   window, and IP geolocation isn't accurate enough to treat a mismatch as
   proof of anything on its own -- only a person with context can tell a
   coordinated attack from an ordinary shared network. This is a
   detection/visibility layer over the three actions ARCHITECTURE.md §9
   names as the highest manipulation-payoff targets (plus the
   address-verification step itself, the root action a Sybil attacker
   performs first) -- it doesn't replace the verification-tier decision
   (ARCHITECTURE.md §13 item 9, still open, still needs counsel), it just
   closes today's "zero defense at all" gap while that larger decision is
   pending. */

import { lookup as geoipLookup } from "geoip-lite";

export type AnomalyAction = "address_verification" | "second" | "call_the_question" | "referendum_ballot";

interface QueryableClient {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

// Pilot-scale starting points, easy to retune once real usage gives a
// baseline for what's actually normal vs suspicious -- same posture as
// MEDIA_RATE_LIMIT_PER_DAY and the admin-login lockout constants.
const VELOCITY_WINDOW_MINUTES = 30;
const VELOCITY_THRESHOLD: Record<AnomalyAction, number> = {
  address_verification: 3, // the root action -- a Sybil attacker mints identities here first
  second: 4,
  call_the_question: 3, // ARCHITECTURE.md §9 itself notes this is the cheaper of the two to brigade (smaller N) -- lower threshold than second
  referendum_ballot: 3,
};

/** Logs this occurrence (for velocity counting) and flags for review if too
    many DISTINCT users have performed this same action from the same
    context recently. Pass the transaction client the caller is already
    using where one exists, so the log entry and the real action commit or
    roll back together -- a plain db() pool also satisfies QueryableClient
    for callers without an existing transaction. */
export async function checkVelocity(
  client: QueryableClient,
  opts: { action: AnomalyAction; userId: string; contextHash: string | null; relatedId?: string },
): Promise<void> {
  await client.query(`INSERT INTO action_context_log (user_id, action_type, context_hash) VALUES ($1, $2, $3)`, [
    opts.userId,
    opts.action,
    opts.contextHash,
  ]);
  if (!opts.contextHash) return; // nothing to correlate on -- can't flag what we can't group

  const since = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60_000);
  const { rows } = await client.query(
    `SELECT count(DISTINCT user_id)::int AS n FROM action_context_log
      WHERE context_hash = $1 AND action_type = $2 AND created_at > $3`,
    [opts.contextHash, opts.action, since],
  );
  const n = rows[0].n as number;
  if (n >= VELOCITY_THRESHOLD[opts.action]) {
    await client.query(
      `INSERT INTO anomaly_flags (user_id, action_type, reason, detail, context_hash, related_id)
       VALUES ($1, $2, 'ip_velocity', $3, $4, $5)`,
      [
        opts.userId,
        opts.action,
        `${n} distinct users performed '${opts.action}' from this context in the last ${VELOCITY_WINDOW_MINUTES} minutes`,
        opts.contextHash,
        opts.relatedId ?? null,
      ],
    );
  }
}

/** Flags (never blocks) if the request's geolocated country isn't the US --
    deliberately coarse. IP geolocation isn't accurate enough for
    state-level comparison to be a low-noise signal (VPNs, mobile carriers,
    and corporate networks routing traffic through a different state are
    all common and innocent); country-level still catches the clearest
    cases for a platform that's entirely US jurisdictions. A real US
    resident traveling abroad triggering a false positive here is exactly
    why this flags for review instead of blocking. */
export async function checkGeoMismatch(
  client: QueryableClient,
  opts: { action: AnomalyAction; userId: string; ip: string | null; relatedId?: string },
): Promise<void> {
  if (!opts.ip) return;
  const geo = geoipLookup(opts.ip);
  if (!geo) return; // unresolvable (private range, lookup miss) -- not evidence of anything, don't flag
  if (geo.country !== "US") {
    await client.query(
      `INSERT INTO anomaly_flags (user_id, action_type, reason, detail, related_id) VALUES ($1, $2, 'geo_mismatch', $3, $4)`,
      [opts.userId, opts.action, `request geolocated to ${geo.country}, not US`, opts.relatedId ?? null],
    );
  }
}

/** Convenience wrapper running both checks -- what every call site below
    actually calls. Never throws on the checks' own account (a detection
    layer failing shouldn't block the real action); errors are logged and
    swallowed rather than propagated. */
export async function flagIfAnomalous(
  client: QueryableClient,
  opts: { action: AnomalyAction; userId: string; ip: string | null; contextHash: string | null; relatedId?: string },
): Promise<void> {
  try {
    await checkVelocity(client, opts);
    await checkGeoMismatch(client, opts);
  } catch (e) {
    console.error(`anomaly detection failed for ${opts.action}/${opts.userId}: ${(e as Error).message}`);
  }
}

/* ── admin review queue ── */
export async function adminAnomalyQueue() {
  const { db } = await import("./db");
  const { rows } = await db().query(
    `SELECT af.id, af.action_type, af.reason, af.detail, af.created_at::date::text AS date,
            COALESCE(u.display_name, 'Resident') AS display_name
       FROM anomaly_flags af JOIN users u ON u.id = af.user_id
      WHERE af.reviewed_at IS NULL
      ORDER BY af.created_at DESC`,
  );
  return rows as {
    id: string; action_type: AnomalyAction; reason: "ip_velocity" | "geo_mismatch"; detail: string | null;
    date: string; display_name: string;
  }[];
}

export async function reviewAnomaly(id: string, action: "dismissed" | "confirmed_ok" | "user_flagged_for_review") {
  const { db } = await import("./db");
  await db().query(`UPDATE anomaly_flags SET reviewed_at = now(), reviewed_action = $2 WHERE id = $1`, [id, action]);
}
