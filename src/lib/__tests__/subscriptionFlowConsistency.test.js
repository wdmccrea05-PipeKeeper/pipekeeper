import { describe, expect, it, vi } from "vitest";
import { buildAccessSummary } from "@/components/access/accessSummary";
import { getModulesFromPlanKey } from "@/components/subscription/subscriptionHandler";
import { getStripeConfig } from "@/components/subscription/stripeConfig";
import { getEntitlementTier } from "@/components/utils/premiumAccess";
import {
  normalizeNativeAppleStatus,
  syncAppleSubscriptionStatus,
} from "@/components/utils/appleSubscriptionSync";

describe("subscription flow consistency", () => {
  it("maps founders bundle to PipeKeeper + WhiskeyKeeper in access summary", () => {
    const summary = buildAccessSummary(
      {},
      { status: "active", plan_key: "founders_bundle_monthly" }
    );

    expect(summary.activeModules).toEqual(["pipekeeper", "whiskeykeeper"]);
  });

  it("maps founders bundle modules consistently in checkout helper", () => {
    expect(getModulesFromPlanKey("founders_bundle_annual")).toEqual([
      "pipekeeper",
      "whiskeykeeper",
    ]);
  });

  it("exposes founders modules consistently in stripe config", () => {
    const config = getStripeConfig();
    expect(config.founders_bundle_monthly.modules).toEqual([
      "pipekeeper",
      "whiskeykeeper",
    ]);
    expect(config.founders_bundle_annual.modules).toEqual([
      "pipekeeper",
      "whiskeykeeper",
    ]);
  });

  it("keeps access summary tier aligned with canonical entitlement resolver", () => {
    const scenarios = [
      {
        user: { entitlement_tier: "free" },
        sub: { status: "active", plan_key: "pipekeeper_pro_monthly" },
        expected: "pro",
      },
      {
        user: { entitlement_tier: "pro", paid_modules_csv: "pipekeeper" },
        sub: null,
        expected: "pro",
      },
      {
        user: { entitlement_tier: "free" },
        sub: null,
        expected: "free",
      },
    ];

    for (const row of scenarios) {
      const canonicalTier = getEntitlementTier(row.user, row.sub);
      const accessTier = buildAccessSummary(row.user, row.sub).tier;
      expect(canonicalTier).toBe(row.expected);
      expect(accessTier).toBe(canonicalTier);
    }
  });

  it("preserves module resolution via metadata/modules_csv callback path", () => {
    const summary = buildAccessSummary(
      {
        role: "admin",
        entitlement_tier: "pro",
        paid_modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper,winekeeper",
      },
      {
        status: "active",
        plan_key: "aggregated_multi_subscription",
        modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper,winekeeper",
        metadata: {
          modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper,winekeeper",
        },
      }
    );

    expect(summary.activeModules.sort()).toEqual([
      "pipekeeper",
      "whiskeykeeper",
      "cigarkeeper",
      "winekeeper",
    ].sort());
  });
});

describe("apple subscription sync", () => {
  it("normalizes premium tier payloads to pro", () => {
    const normalized = normalizeNativeAppleStatus({
      active: true,
      tier: "premium",
      productId: "com.pipekeeper.pro.monthly",
      originalTransactionId: " tx_123 ",
    });

    expect(normalized.tier).toBe("pro");
    expect(normalized.originalTransactionId).toBe("tx_123");
  });

  it("skips active sync when originalTransactionId is missing", async () => {
    const invoke = vi.fn();

    const result = await syncAppleSubscriptionStatus(
      { active: true, tier: "pro", productId: "com.pipekeeper.pro.monthly" },
      { invoke }
    );

    expect(result.skipped).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("invalidates and refetches user state after successful sync", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true } });
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const refetch = vi.fn().mockResolvedValue(undefined);

    await syncAppleSubscriptionStatus(
      {
        active: true,
        tier: "pro",
        productId: "com.pipekeeper.pro.monthly",
        originalTransactionId: "tx_123",
      },
      {
        invoke,
        queryClient: { invalidateQueries },
        refetch,
      }
    );

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
