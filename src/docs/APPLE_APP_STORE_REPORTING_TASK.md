# Apple App Store Subscription Reporting — Implementation Task

**Status:** Not started · **Priority:** High · **Blocks:** reliability status → `verified`

## Why this exists

CollectionKeeper has 62 Apple Subscription records and 55 Apple ActiveContracts in the
database, but the canonical `SubscriptionEvent` ledger contains **zero** Apple events.
Until Apple transaction ingestion is configured, the subscription reporting system is
`partially_verified` — Stripe reporting is transaction-backed and dependable, but the
full paid-user picture is incomplete because Apple revenue and lifecycle events are not
represented in the ledger.

This task must be completed before the reliability status can move from
`partially_verified` to `verified`.

## Requirements

### 1. Transaction ingestion

- Subscribe to App Store Server Notifications V2 (Sandbox + Production environments).
- Verify the JWS signature (`x5c` header chain → Apple Root G3 CA) on every notification.
- Decode the `signedPayload` (JWS) → `signedTransactionInfo` + `signedRenewalInfo`.
- Map App Store notification types to the canonical `normalized_event_type` enum:
  - `SUBSCRIBED` → `initial_purchase` (or `trial_start` if `offerType` = introductory trial)
  - `DID_RENEW` → `renewal`
  - `DID_FAIL_TO_RENEW` → `payment_failed` / `grace_period`
  - `REFUND` → `refund_full`
  - `REVOKE` → `expiration` (with `is_revoked` = true)
  - `GRACE_PERIOD_EXPIRED` → `expiration`
  - `PRICE_INCREASE` → `product_change`
  - `DID_CHANGE_RENEWAL_STATUS` → `cancellation` (when `autoRenewStatus` = off)

### 2. Historical backfill

- Use the App Store Server API (`GET /inAppPurchase/v1/transactions`) with
  `sort=ascending` to backfill all historical transactions for every
  `originalTransactionId` currently in the `Subscription` / `ActiveContract` tables.
- Backfill range: from the earliest Apple subscription record (determine from
  `ActiveContract.normalized_at` / `Subscription.started_at`) through today.
- Set `source_system = "backfill"` on all backfilled `SubscriptionEvent` rows.
- Update `ProviderSyncHealth` for `provider = "apple"`:
  `backfill_status = "complete"`, `backfill_range_start`, `backfill_range_end`,
  `backfill_events_imported`.

### 3. App Store Server Notification verification

- Verify the JWS `x5c` certificate chain terminates at the Apple App Store Root CA - G3.
- Reject any notification whose signature chain is invalid (record a
  `signature_verification_failures` increment on `ProviderSyncHealth`, return 400).
- Implement replay protection: store `notificationUUID` in
  `SubscriptionEvent.provider_event_id` for idempotency (the existing
  `getUnmatchedPayments` / `stripeWebhook` dedupe pattern applies).

### 4. Original transaction ID mapping

- `originalTransactionId` is the stable lifecycle identifier — store it in
  `SubscriptionEvent.original_transaction_id` and `ActiveContract.provider_subscription_id`.
- `transactionId` (changes each renewal) goes in `provider_transaction_id`.
- Group all renewals, refunds, and revocations under the same `originalTransactionId`.

### 5. User matching

- Match Apple transactions to internal users via `appAccountToken` (Storekit2
  `appAccountToken()` UUID passed at purchase) — store this in `user_id` at ingestion.
- Fallback: match via receipt `originalPurchaseDate` + product ID against
  existing `Subscription` records where `provider = "apple"`.
- If no match: set `reconciliation_status = "unmatched_provider_no_user"` and
  surface in `getUnmatchedPayments` for administrative review (same workflow as Stripe).

### 6. Renewal / refund / revocation handling

- `DID_RENEW` with `price` > 0 → `is_successful_payment = true`, `is_renewal = true`.
- `REFUND` → `is_refund = true`, `is_full_refund = true`; link to original
  purchase via `originalTransactionId` (same refund-linking logic as Stripe).
- `REVOKE` → `is_reactivation = false`, set `expired_at`; revoke entitlement by
  recomputing `UserEntitlement` from `ActiveContract` rows (the existing
  `reconcileEntitlementsOnLogin` / entitlement rebuild flow handles this).
- Partial refunds: Apple does not support partial refunds; all `REFUND` events
  are full refunds.

### 7. Required credentials and configuration

- **Issuer ID** — Apple Connect → Users and Access → Keys → In-App Purchase (issuer ID).
- **Key ID** — same page, generate a new API key.
- **Private Key** — `.p8` file downloaded once at key creation.
- **Shared Secret** — App Store Server Notifications V2 (no shared secret in V2;
  verification is via JWS signature only — V1 shared secret is deprecated and not used).
- **Bundle ID** — the CollectionKeeper iOS app bundle ID.
- **Environment URLs** — Sandbox: `https://api.storekit-sandbox.itunes.apple.com`
  Production: `https://api.storekit.itunes.apple.com`
- Set as Base44 secrets: `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`,
  `APPLE_BUNDLE_ID`, `APPLE_ENVIRONMENT`.

### 8. Tests required before enabling verified Apple reporting

- Unit: notification type → `normalized_event_type` mapping for all 8 notification types.
- Unit: JWS signature verification (valid chain, expired cert, wrong root → reject).
- Unit: `originalTransactionId` grouping (renewals, refund, revocation share lifecycle).
- Unit: `appAccountToken` → `user_id` resolution and fallback matching.
- Unit: `$0` / free-trial Apple offers classified as `trial_start` (not paid).
- Integration: webhook endpoint with signed payload → ledger row + entitlement update.
- Integration: backfill endpoint imports all historical transactions idempotently.
- Regression: `getUserSubscriptionReportV3` reliability status moves to `verified`
  only after Apple backfill + zero unmatched + zero orphaned entitlements.
- Regression: `getUnmatchedPayments` returns Apple events in a separate category
  (`unmatched_apple_transactions`) without inflating Stripe totals.

## Acceptance criteria

- [ ] Apple `SubscriptionEvent` rows exist for all 62 existing Apple subscriptions.
- [ ] `ProviderSyncHealth.backfill_status = "complete"` for Apple.
- [ ] `ProviderSyncHealth.last_successful_webhook_at` set within the last 24h.
- [ ] `reliability.providerCoverage.apple = "connected"`.
- [ ] `reliability.status` moves to `verified` (all three blockers resolved).
- [ ] Zero unmatched Apple paid transactions after backfill.
- [ ] Refund/revocation correctly reduces entitlements.

## Do not

- Do not infer Apple revenue from the legacy `Subscription` rows alone — the
  ledger must be populated from verified App Store Server API transactions.
- Do not mark Apple as `connected` until the webhook receives and verifies at
  least one real notification.
- Do not treat `not_configured` as `not_applicable` — Apple is relevant (62
  records exist) and must lower reliability until configured.