import { useEffect, useState } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";

/**
 * Hook to determine if module selection onboarding should be shown.
 *
 * - module_preferences_set is read from UserProfile via useModuleVisibility (canonical source).
 * - Shows the modal on every load until the user completes module selection.
 *   Refresh-suppression for the post-selection onboarding flow is handled
 *   separately by OnboardingRouter via pk_auto_launch_onboarding.
 * - Users who already have active modules via entitlements skip the modal.
 */
export function useModuleOnboarding() {
  const { profile, isLoading } = useModuleVisibility();
  const access = useAccessSummary();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // UNKNOWN/LOADING MUST NEVER MEAN "NEW FREE USER".
    //
    // useAccessSummary intentionally returns null while current-user,
    // subscription, or profile data is still resolving. Previously this hook
    // treated that null as "no active modules" as soon as module visibility
    // finished loading, which could flash a blank shell and then launch the
    // first-run/free-user module-selection flow for an existing paid user.
    //
    // Only make an onboarding decision after BOTH profile and canonical access
    // have resolved. A missing profile by itself is not proof of a new/free
    // account.
    if (isLoading || access == null) return;

    const hasActiveModules = Array.isArray(access.activeModules) && access.activeModules.length > 0;
    const hasSetPreferences = profile?.module_preferences_set === true;

    // Existing paid/entitled users must never be pushed into first-run module
    // selection merely because profile/preferences are missing or temporarily
    // unavailable.
    if (hasActiveModules || hasSetPreferences) {
      setShowModal(false);
      return;
    }

    setShowModal(true);
  }, [profile?.module_preferences_set, isLoading, access]);

  return { showModal, setShowModal };
}