-- Per-admin accounts + per-screen access (2026-08-19). Replaces the flat
-- single-shared-TOTP model (one ADMIN_TOTP_SECRET, isAdmin() a plain
-- yes/no) -- owner asked for this specifically while the payment feature
-- (migration 085) was mid-build, wanting to eventually hand a second person
-- access to just the payments screen without giving them everything else.
--
-- Permissions are per-SCREEN checkboxes (owner's explicit choice over a
-- small fixed set of named roles) -- admin_screen_access is a plain join
-- table, one row per (admin, screen) grant, rather than a role table one
-- level removed from the actual screens.
--
-- No FK from any existing admin-mutation table to admin_accounts --
-- reconciled_by (payment_verifications) stays a free-text label rather
-- than becoming a hard reference, since this migration doesn't touch
-- that table's shape, just adds the accounts alongside it.
CREATE TABLE admin_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username     TEXT NOT NULL UNIQUE,
    -- Same base32 TOTP secret format/verification (totpVerify in
    -- adminAuth.ts) as the single shared secret this replaces -- just one
    -- column per admin now instead of one process-wide env var. The
    -- bootstrap script (db/bootstrap-admin.mjs) seeds the owner's first
    -- row from their EXISTING ADMIN_TOTP_SECRET value, so their
    -- already-enrolled authenticator app entry keeps working with zero
    -- re-enrollment.
    totp_secret  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at  TIMESTAMPTZ                          -- soft-disable (revoke access without losing the audit trail of who this was)
);

-- The canonical screen_key list lives in code (SCREEN_KEYS in
-- adminAuth.ts), not a DB CHECK constraint -- a new admin screen shipping
-- shouldn't need a migration just to become grantable.
CREATE TABLE admin_screen_access (
    admin_id    UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    screen_key  TEXT NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (admin_id, screen_key)
);
