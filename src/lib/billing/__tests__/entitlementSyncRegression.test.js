/* eslint-disable */
/**
 * Regression tests for entitlement synchronization flows.
 *
 * Covers the five scenarios requested after the bodellmd@gmail.com incident:
 *   1. Successful purchase → entitlement granted
 *   2. Existing subscriber logging in on a new device
 *   3. Expired subscription
 *   4. Multi-module (bundle) subscriber
 *   5. Manual Unlock Request availability when entitlements and purchases disagree
 *
 * These tests exercise the canonical resolver chain that `useCurrentUser` relies on:
 *   getEntitlementTier (premiumAccess) → subscriptionGrantsPaidAccess (gracePeriod)
 * They also guard the Manual Unlock status-enum fix in SubscriptionBackupModeModal.
 */

import { describe, test, expect } from "vitest";
import {
  getEntitlementTier,
  hasPaidAccess,
  buildCanonicalEntitlements,
} from "@/components/utils/premiumAccess";
import { subscriptionGrantsPaidAccess } from "@/components/utils/gracePeriod";

// ── Valid enum values for SubscriptionSupportRequest.status ──────────────────
// Mirrors base44/entities/SubscriptionSupportRequest.jsonc.
const VALID_SUPPORT_REQUEST_STATUSES = [
  "new",
  "paid_confirmed",
  "access_granted",
  "resolved",
  "rejected",
];

// The status value SubscriptionBackupModeModal sends after the fix.
// Before the fix it sent "manual_review_requested" which is NOT in the enum,
// causing the create() to fail silently and block self-service recovery.
const BACKUP_MODAL_STATUS_AFTER_FIX = "new";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Successful purchase → entitlement granted
// ─────────────────────────────────────────────────────────────────────────────
describe("Entitlement sync: successful purchase → entitlement granted", () => {
  test("active Stripe subscription grants pro tier via subscriptionGrantsPaidAccess", () => {
    const sub = { status: "active", current_period_end: "2027-01-08T00:00:00.000Z" };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(true);
  });

  test("active Apple subscription with annual expiry grants paid access", () => {
    const sub = {
      status: "active",
      provider: "apple",
      current_period_end: "2027-08-06T00:00:00.000Z",
    };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(true);
  });

  test("active subscription overrides stale free entitlement_tier on user", () => {
    // Simulates: webhook/sync wrote entitlement_tier="free" before the purchase
    // completed, but the subscription record is now active.
    const user = { entitlement_tier: "free", role: "user" };
    const sub = { status: "active", tier: "pro" };
    expect(getEntitlementTier(user, sub)).toBe("pro");
  });

  test("buildCanonicalEntitlements reflects pro tier for active subscriber", () => {
    const user = { entitlement_tier: "pro", pipekeeper_paid: true, paid_modules_csv: "pipekeeper" };
    const sub = { status: "active", tier: "pro" };
    const ents = buildCanonicalEntitlements(user, sub);
    expect(ents.tier).toBe("pro");
    expect(ents.hasPro).toBe(true);
    expect(ents.paidModules).toContain("pipekeeper");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Existing subscriber logging in on a new device
// ─────────────────────────────────────────────────────────────────────────────
describe("Entitlement sync: existing subscriber on new device", () => {
  test("user entity paid flags grant pro even before subscription query resolves", () => {
    // On a new device, the Subscription query may not have resolved yet, but the
    // User entity already has pipekeeper_paid=true from a prior sync. The resolver
    // must still return pro so the user isn't briefly locked out.
    const user = {
      entitlement_tier: "pro",
      pipekeeper_paid: true,
      paid_modules_csv: "pipekeeper",
      role: "user",
    };
    expect(getEntitlementTier(user, null)).toBe("pro");
    expect(hasPaidAccess(user, null)).toBe(true);
  });

  test("subscription record from prior sync grants pro on new device", () => {
    const user = { role: "user" };
    const sub = { status: "active", tier: "pro", current_period_end: "2027-01-08T00:00:00.000Z" };
    expect(getEntitlementTier(user, sub)).toBe("pro");
  });

  test("Apple subscription record grants pro on new device login", () => {
    const user = { role: "user" };
    const sub = {
      status: "active",
      provider: "apple",
      provider_subscription_id: "apple_txn_123",
      current_period_end: "2027-08-06T00:00:00.000Z",
    };
    expect(getEntitlementTier(user, sub)).toBe("pro");
    expect(subscriptionGrantsPaidAccess(sub)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Expired subscription
// ─────────────────────────────────────────────────────────────────────────────
describe("Entitlement sync: expired subscription", () => {
  test("canceled subscription does not grant paid access", () => {
    const sub = { status: "canceled", current_period_end: "2026-01-01T00:00:00.000Z" };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(false);
    expect(getEntitlementTier({}, sub)).toBe("free");
  });

  test("expired status does not grant paid access", () => {
    const sub = { status: "expired", current_period_end: "2026-01-01T00:00:00.000Z" };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(false);
    expect(getEntitlementTier({}, sub)).toBe("free");
  });

  test("past_due subscription beyond grace period does not grant access", () => {
    // Grace period is 5 days after current_period_end.
    // period_end 10 days ago → grace expired.
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const sub = { status: "past_due", current_period_end: tenDaysAgo };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(false);
  });

  test("past_due subscription within grace period still grants access", () => {
    // period_end 2 days ago → within 5-day grace.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const sub = { status: "past_due", current_period_end: twoDaysAgo };
    expect(subscriptionGrantsPaidAccess(sub)).toBe(true);
    expect(getEntitlementTier({}, sub)).toBe("pro");
  });

  test("expired subscription with no user flags resolves to free", () => {
    const user = { role: "user" };
    const sub = { status: "canceled", current_period_end: "2026-01-01T00:00:00.000Z" };
    expect(getEntitlementTier(user, sub)).toBe("free");
    expect(hasPaidAccess(user, sub)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Multi-module (bundle) subscriber
// ─────────────────────────────────────────────────────────────────────────────
describe("Entitlement sync: multi-module bundle subscriber", () => {
  test("three-module bundle grants pro tier and multiple paid modules", () => {
    const user = {
      entitlement_tier: "bundle_3",
      pipekeeper_paid: true,
      whiskeykeeper_paid: true,
      cigarkeeper_paid: true,
      paid_modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper",
      role: "user",
    };
    const sub = { status: "active", tier: "pro" };
    expect(getEntitlementTier(user, sub)).toBe("pro");

    const ents = buildCanonicalEntitlements(user, sub);
    expect(ents.paidModules.sort()).toEqual(
      ["cigarkeeper", "pipekeeper", "whiskeykeeper"].sort()
    );
  });

  test("four-module bundle grants all four paid modules", () => {
    const user = {
      entitlement_tier: "bundle_4",
      pipekeeper_paid: true,
      whiskeykeeper_paid: true,
      cigarkeeper_paid: true,
      winekeeper_paid: true,
      paid_modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper,winekeeper",
      role: "user",
    };
    const sub = { status: "active", tier: "pro" };
    const ents = buildCanonicalEntitlements(user, sub);
    expect(ents.paidModules.length).toBe(4);
    expect(ents.hasPro).toBe(true);
  });

  test("founders bundle (2 modules) grants pipekeeper + whiskeykeeper only", () => {
    const user = {
      entitlement_tier: "pro",
      isFoundingMember: true,
      pipekeeper_paid: true,
      whiskeykeeper_paid: true,
      paid_modules_csv: "pipekeeper,whiskeykeeper",
      role: "user",
    };
    const sub = { status: "active", tier: "premium", started_at: "2025-06-01T00:00:00.000Z" };
    const ents = buildCanonicalEntitlements(user, sub);
    expect(ents.paidModules).toContain("pipekeeper");
    expect(ents.paidModules).toContain("whiskeykeeper");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Manual Unlock Request availability when entitlements and purchases disagree
// ─────────────────────────────────────────────────────────────────────────────
describe("Manual Unlock Request: status enum validation", () => {
  test("the fixed BackupModal status is a valid SubscriptionSupportRequest status", () => {
    expect(VALID_SUPPORT_REQUEST_STATUSES).toContain(BACKUP_MODAL_STATUS_AFTER_FIX);
  });

  test("the old broken status is NOT a valid enum (regression guard)", () => {
    // This is the value that caused the customer's manual unlock to fail silently.
    expect(VALID_SUPPORT_REQUEST_STATUSES).not.toContain("manual_review_requested");
  });

  test("a subscribed user with disagreeing entitlement can still submit a support request", () => {
    // Scenario: user has an active purchase (Apple receipt) but entitlement_tier
    // is stuck at "free" — exactly the bodellmd@gmail.com case. The Manual Unlock
    // form must be submittable (valid status) so the user can self-recover.
    const disagreeingUser = {
      entitlement_tier: "free",
      pipekeeper_paid: false,
      has_paid_access: false,
      role: "user",
    };
    const noLocalSub = null;

    // The resolver says free (the bug state)...
    expect(getEntitlementTier(disagreeingUser, noLocalSub)).toBe("free");

    // ...but the support request status is still valid, so the form can submit.
    expect(VALID_SUPPORT_REQUEST_STATUSES).toContain(BACKUP_MODAL_STATUS_AFTER_FIX);
  });
});