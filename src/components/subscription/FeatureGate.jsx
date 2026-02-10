import React from "react";
import { useEntitlements } from "@/components/hooks/useEntitlements";
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

  // Check if user has access to this feature
  if (feature && !entitlements.canUse(feature)) {
    return (
      <UpgradePrompt 
        featureName={featureName || feature}
        description={description || `This feature requires ${requiredTier === 'pro' ? 'Pro' : 'Premium'} tier.`}
      />
    );
  }

  // Check tier if specified (for simple tier gating without feature key)
  if (!feature && requiredTier) {
    const hasAccess = requiredTier === "premium" 
      ? entitlements.tier !== "free"
      : entitlements.tier === "pro" || entitlements.isPremiumLegacy;

    if (!hasAccess) {
      return (
        <UpgradePrompt 
          featureName={featureName || `${requiredTier} Feature`}
          description={description || `This feature requires ${requiredTier === 'pro' ? 'Pro' : 'Premium'} tier.`}
        />
      );
    }
  }

  // User has access - render children
  return <>{children}</>;
}