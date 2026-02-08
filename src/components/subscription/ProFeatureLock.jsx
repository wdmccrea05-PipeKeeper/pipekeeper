import React, { useState } from "react";
import { Lock } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import ProUpgradeModal from "./ProUpgradeModal";

/**
 * ProFeatureLock - Renders a lock icon for Pro-only features
 * Clicking opens upgrade modal if user doesn't have Pro access
 * 
 * @param {ReactNode} children - The Pro feature content
 * @param {string} featureName - Feature name for the upgrade prompt
 * @param {boolean} showLockIcon - Whether to show lock icon (default: true)
 * @param {string} className - Additional classes for wrapper
 */
export default function ProFeatureLock({ 
  children, 
  featureName = "This Pro feature",
  showLockIcon = true,
  className = ""
}) {
  const { effectiveTier } = useCurrentUser();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // If user has Pro, render children normally
  if (effectiveTier === "pro") {
    return <>{children}</>;
  }
  
  // Render children with lock icon overlay for Premium users
  return (
    <>
      <div className={`relative ${className}`}>
        {children}
        {showLockIcon && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors duration-200 z-10"
            aria-label="Upgrade to Pro"
            title="Upgrade to Pro for this feature"
          >
            <Lock className="w-4 h-4 text-amber-500" />
          </button>
        )}
      </div>
      
      <ProUpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={featureName}
      />
    </>
  );
}