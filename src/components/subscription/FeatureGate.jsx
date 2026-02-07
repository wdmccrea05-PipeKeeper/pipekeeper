import React from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import UpgradePrompt from "./UpgradePrompt";

/**
 * FeatureGate - Conditional rendering based on entitlements
 * 
 * @param {string} feature - Deprecated: not used
 * @param {ReactNode} children - Content to render if user has access
 * @param {string} featureName - Display name for upgrade prompt
 * @param {string} description - Description for upgrade prompt
 * @param {string} requiredTier - Minimum tier required ('premium' or 'pro')
 */
export default function FeatureGate({ 
  children, 
  featureName, 
  description,
  requiredTier = "pro"
}) {
  const { hasPro } = useCurrentUser();

  // Pro features require Pro tier
  if (requiredTier === "pro" && !hasPro) {
    return (
      <UpgradePrompt 
        featureName={featureName || "Pro Feature"}
        description={description || "This feature requires Pro tier."}
      />
    );
  }

  // User has access - render children
  return <>{children}</>;
}