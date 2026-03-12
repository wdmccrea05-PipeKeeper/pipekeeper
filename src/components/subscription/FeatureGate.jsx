import React from "react";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { useTranslation } from "@/components/i18n/safeTranslation";
import UpgradePrompt from "./UpgradePrompt";

/**
 * FeatureGate - Conditional rendering based on entitlements
 * 
 * @param {string} feature - Feature key to check (e.g., 'AI_IDENTIFY', 'EXPORT_REPORTS')
 * @param {ReactNode} children - Content to render if user has access
 * @param {string} featureName - Display name for upgrade prompt
 * @param {string} description - Description for upgrade prompt
 * @param {string} requiredTier - Minimum tier required ('premium' or 'pro')
 */
export default function FeatureGate({ 
  feature, 
  children, 
  featureName, 
  description,
  requiredTier = "premium"
}) {
  const entitlements = useEntitlements();
  const { t } = useTranslation();

  // Check if user has access to this feature
  if (feature && !entitlements.canUse(feature)) {
    return (
      <UpgradePrompt 
        featureName={featureName || t(requiredTier === 'pro' ? 'featureGate.proFeature' : 'featureGate.premiumFeature')}
        description={description || t(requiredTier === 'pro' ? 'featureGate.requiresProTier' : 'featureGate.requiresPremiumTier')}
      />
    );
  }

  // Check tier if specified (for simple tier gating without feature key)
  if (!feature && requiredTier && entitlements) {
    // FIX BUG-05: Legacy premium users (isLegacyPremium) get all pro features (grandfathered)
    // Safely handle null entitlements object — fail closed to premium/pro gate
    const hasAccess = requiredTier === "premium" 
      ? (entitlements.tier !== "free" && entitlements.tier !== undefined) || entitlements.isFreeGrandfathered
      : entitlements.tier === "pro" || entitlements.isLegacyPremium; // legacy gets pro features

    if (!hasAccess) {
      return (
        <UpgradePrompt 
          featureName={featureName || t(requiredTier === 'pro' ? 'featureGate.proFeature' : 'featureGate.premiumFeature')}
          description={description || t(requiredTier === 'pro' ? 'featureGate.requiresProTier' : 'featureGate.requiresPremiumTier')}
        />
      );
    }
  }

  // User has access - render children
  return <>{children}</>;
}