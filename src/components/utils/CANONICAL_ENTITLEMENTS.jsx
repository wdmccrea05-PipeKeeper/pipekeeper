# Canonical Entitlement Resolver

This document describes the canonical entitlement logic used across PipeKeeper.

## Single Source of Truth

All entitlement checks must use these canonical functions:

- **Frontend**: `components/utils/premiumAccess.jsx`
  - `getEntitlementTier(user, subscription)` — returns 'free', 'premium', or 'pro'
  - `hasPaidAccess(user, subscription)` — returns true if user has premium OR pro
  - `hasProAccess(user, subscription)` — returns true if user has pro
  - `isTrialingAccess(user, subscription)` — returns true if valid trial (not expired)
  - `isFoundingMember(user)` — returns true if founding member
  - `isLegacyPremium(subscription)` — returns true if premium user before cutoff

- **Backend**: `functions/stripeWebhook.js` and `functions/syncSubscriptionForMe.js`
  - `subscriptionGrantsPaidAccess(subscription)` — checks if subscription grants access (grace period aware)
  - `isSubscriptionInGracePeriod(subscription)` — checks 5-day grace after payment failure
  - `getTier(sub, stripe)` — resolves tier from metadata/price/product (returns null if unknown)

## Grace Period Policy

**Constant**: `GRACE_PERIOD_DAYS = 5`

Failed payment subscriptions (`past_due`, `incomplete`, `unpaid`) receive 5 days after `current_period_end` before access is suspended.

**Location**: Defined in both `components/utils/gracePeriod.jsx` and inlined in backend functions.

## Founding Member Cutoff

**Constant**: `FOUNDING_MEMBER_CUTOFF = new Date("2026-02-01T00:00:00.000Z")`

Users who became paid subscribers BEFORE this date get:
- Founding member badge
- Legacy premium → Pro feature access (grandfathered)

**Locations**:
- Frontend: `components/utils/premiumAccess.jsx` — `FOUNDING_MEMBER_CUTOFF`
- Backend: `functions/syncSubscriptionForMe.js` — hardcoded as `"2026-02-01T00:00:00.000Z"`

## Trial Expiration

**Rule**: If subscription status is `trialing` but `trial_end` is in the past, do NOT treat as active trial.

**Implementation**: `isTrialingAccess()` validates `trial_end` date before returning true.

## Tier Resolution Priority

Frontend (`getEntitlementTier`):
1. `user.entitlement_tier` (top-level or in `data` blob)
2. `user.subscription_tier` (legacy)
3. Subscription entity tier (if `subscriptionGrantsPaidAccess` is true)
4. Return 'free'

Backend (`getTier` in stripeWebhook):
1. `subscription.metadata.tier`
2. Price `lookup_key` / `nickname` from Stripe
3. Product metadata or name from Stripe
4. Env-mapped price ID match
5. Return `null` (NOT 'premium') if unknown

**Never default unknown subscriptions to 'premium'** — this is a security risk.

## Webhook → User Sync Flow

1. Webhook receives Stripe event
2. `getTier()` resolves tier from subscription metadata/price/product
3. `subscriptionGrantsPaidAccess()` determines if subscription grants access
4. If `isPaid=true` and tier is unknown, default to 'premium' (safe, user just paid)
5. If `isPaid=false` and tier is unknown, leave tier as `null`
6. Write to User entity: `subscription_tier`, `entitlement_tier`, `subscription_level`
7. Frontend queries user, uses `getEntitlementTier()` to resolve final tier

## Frontend Data Freshness

- `useCurrentUser()` caches subscription with `staleTime: 5 * 60 * 1000` (5 minutes)
- Sync on mount via `syncSubscriptionForMe()` every 10 minutes (gate in sessionStorage)
- After sync, `invalidateQueries` and `refetch` to pick up new data
- No constant refetching — subscription is mostly static

## Feature Gating

**FeatureGate component** uses `useEntitlements()`:
- Null/undefined entitlements fail CLOSED (require upgrade)
- Legacy premium users get Pro features (via `isLegacyPremium` check)
- Gracefully handles missing subscription object

## Testing Scenarios

1. **Stripe active** → `subscriptionGrantsPaidAccess()` returns true → `getEntitlementTier()` returns 'premium' or 'pro'
2. **Stripe unknown/incomplete** → `getTier()` returns null → user tier stays at existing value (no downgrade)
3. **Trial expired** → `isTrialingAccess()` validates `trial_end` and returns false
4. **Founding member** → `isFoundingMember()` checks user flag → granted legacy Pro features
5. **Apple paid** → `subscription.provider='apple'` → `subscriptionGrantsPaidAccess()` respects status
6. **Free user** → `getEntitlementTier()` returns 'free' → no features
7. **Matching regenerate** → `invalidateQueries` + `refetch` on success → UI shows new results
8. **Onboarding in private mode** → Safe storage wrappers handle exceptions → no crash

## Known Technical Debt

- Slice tier resolution duplicated in multiple files (refactor to service functions if scale requires)
- Grace period logic inlined in both frontend and backend (could extract to shared constant)
- Trial validation added to frontend; backend trusts Stripe status (acceptable asymmetry)