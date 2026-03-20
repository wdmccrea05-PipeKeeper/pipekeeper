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
 *   - "premium" requiredTier is treated as "pro" (no premium tier exists).
 *
 * @param {string}    feature      - Feature key to check via canUse()
 * @param {ReactNode} children     - Content to show if access granted
 * @param {string}    featureName  - Display name for upgrade prompt
 * @param {string}    description  - Description for upgrade prompt
 * @param {string}    requiredTier - 'pro' (default). 'premium' also treated as 'pro'.
 */
export default function FeatureGate({
  feature,
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
      featureName={featureName || t("featureGate.proFeature", "Pro Feature")}
      description={description || t("featureGate.requiresProTier", "Upgrade to Pro to unlock this feature.")}
    />
  );

  // Feature key check
  if (feature) {
    return entitlements.canUse(feature) ? <>{children}</> : upgradePrompt;
  }

  // Tier check (pro or premium both require hasPro)
  return entitlements.hasPro ? <>{children}</> : upgradePrompt;
}