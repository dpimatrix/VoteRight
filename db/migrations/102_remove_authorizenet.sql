-- Removes Authorize.Net support entirely (2026-09-05, owner's explicit
-- request: "remove the autorized.net screen settings from admin" ->
-- clarified to full removal, no dead code). It was multi-gateway from the
-- very start (migration 085) but never actually configured or tested
-- against a real Authorize.Net account (ARCHITECTURE.md §9.2's own note:
-- "Authorize.Net's integration remains completely untested against any
-- live account") -- VoteRight fully committed to Stripe as the sole
-- gateway instead. See paymentVerification.ts's own header comment for
-- the application-level side of this same removal.
--
-- active_gateway goes away with it, not just Authorize.Net's own fields --
-- with a single gateway there's nothing left to select between, so the
-- admin dropdown that used to choose one is gone too (app/src/app/admin/
-- payments/page.tsx now just shows Stripe's own card unconditionally).
--
-- payment_verifications.gateway is KEPT (unlike payment_settings'
-- Authorize.Net columns) -- it's still meaningful per-transaction
-- attribution of which processor handled a given charge, harmless to keep
-- constant-valued for now, and cheaper to leave in place than to unwind
-- every join/lookup that keys off it (handleGatewayWebhook, admin
-- reconciliation) for a column that costs nothing sitting at one value.
-- Its CHECK constraint is narrowed to match reality rather than dropped
-- outright, same defensive-schema instinct as everywhere else in this
-- project.
ALTER TABLE payment_settings
  DROP COLUMN active_gateway,
  DROP COLUMN authorizenet_api_login_id,
  DROP COLUMN authorizenet_transaction_key,
  DROP COLUMN authorizenet_public_client_key,
  DROP COLUMN authorizenet_signature_key,
  DROP COLUMN authorizenet_environment;

ALTER TABLE payment_verifications
  DROP CONSTRAINT payment_verifications_gateway_check,
  ADD CONSTRAINT payment_verifications_gateway_check CHECK (gateway IN ('stripe'));
