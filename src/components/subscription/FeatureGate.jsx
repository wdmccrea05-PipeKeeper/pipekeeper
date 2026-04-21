import React from "react";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useTranslation } from "@/components/i18n/safeTranslation";
import UpgradePrompt from "./UpgradePrompt";

/**
 * FeatureGate — conditional rendering based on Pro entitlement.
 *
 * Rules:
 *   - While loading (tier === null), render nothing — never show upgrade prompt to loading users.
 *   - Pro users always see children.
 *   - Free users see UpgradePrompt.
 *   - When moduleKey is provided, checks per-module access via paid_modules_csv.
 *
 * @param {string}    feature      - Feature key to check via canUse()
 * @param {string}    moduleKey    - Module key (e.g. 'whiskeykeeper') for per-module locking
 * @param {ReactNode} children     - Content to show if access granted
 * @param {string}    featureName  - Display name for upgrade prompt
 * @param {string}    description  - Description for upgrade prompt
 * @param {string}    requiredTier - 'pro' (default).
 */
export default function FeatureGate({
  feature,
  moduleKey,
  children,
  featureName,
  description,
  requiredTier = "pro",
}) {
  const entitlements = useEntitlements();
  const { t } = useTranslation();

  // While loading — render nothing (no flicker of upgrade wall for paid users)
  if (entitlements.tier === null) return null;

  const upgradePrompt = (
    <UpgradePrompt
      featureName={featureName || t("featureGate.proFeature")}
      description={description || t("featureGate.requiresProTier")}
      moduleKey={moduleKey}
    />
  );

  // Per-module check takes priority when provided
  if (moduleKey) {
    return entitlements.hasModuleAccess(moduleKey) ? <>{children}</> : upgradePrompt;
  }

  // Feature key check
  if (feature) {
    return entitlements.canUse(feature) ? <>{children}</> : upgradePrompt;
  }

  // Tier check
  return entitlements.hasPro ? <>{children}</> : upgradePrompt;
}
