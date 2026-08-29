-- Idempotency guard for Authorize.Net direct charges (found live 2026-08-29,
-- code review of the payment-verification core). Unlike Stripe's
-- PaymentIntent model -- which is idempotent by construction, a client
-- confirms an existing intent, it can't accidentally create a second charge
-- for the same intent -- chargeAuthorizeNetToken's flow was a raw "check
-- status, then charge, then record the result" sequence with nothing
-- claiming the row BEFORE the external charge fires. A double-click, a
-- client timeout that retries with a freshly-tokenized dataDescriptor/
-- dataValue, or a charge that succeeds but whose OWN result-recording DB
-- write then fails and gets naively retried, could all trigger a second
-- real charge on the customer's card for one verification fee.
--
-- 'processing' closes it: chargeAuthorizeNetToken now atomically claims a
-- record via `UPDATE ... SET status = 'processing' WHERE status = 'pending'`
-- before ever calling out to Authorize.Net -- only one concurrent caller can
-- ever win that transition for a given row (ordinary Postgres row-level
-- locking on the UPDATE), and a retry that lands after the first attempt
-- already advanced the row past 'pending' finds it in 'processing' (or a
-- terminal state) and refuses to charge again, full stop, rather than
-- re-attempting. Stripe's webhook-driven path never needs to pass through
-- this state -- it can go straight from 'pending' to a terminal status --
-- but allowing it doesn't cost that path anything.
ALTER TABLE payment_verifications DROP CONSTRAINT payment_verifications_status_check;
ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check
  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded'));
