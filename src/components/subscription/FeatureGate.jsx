import React from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import UpgradePrompt from "./UpgradePrompt";

/**
 * FeatureGate - Conditional rendering based on effectiveTier
 * 
 * @param {ReactNode} children - Content to render if user has access
 * @param {string} featureName - Display name for upgrade prompt
 * @param {string} description - Description for upgrade prompt
 * @param {string} requiredTier - Minimum tier required ('premium' or 'pro', default 'premium')
 */
export default function FeatureGate({ 
  children, 
  featureName, 
  description,
  requiredTier = "premium"
}) {
  const { effectiveTier } = useCurrentUser();

  // Check if user has required tier
  const hasAccess = effectiveTier !== "free" && 
    (requiredTier === "premium" || effectiveTier === requiredTier);

  if (!hasAccess) {
    return (
      <UpgradePrompt 
        featureName={featureName || "Premium Feature"}
        description={description || "This feature requires Premium or higher."}
      />
    );
  }

  // User has access - render children
  return <>{children}</>;
}