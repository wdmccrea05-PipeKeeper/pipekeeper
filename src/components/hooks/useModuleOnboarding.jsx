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
    if (isLoading) return;
    const hasActiveModules = access?.activeModules?.length > 0;
    const hasSetPreferences = profile?.module_preferences_set === true;
    setShowModal(!hasSetPreferences && !hasActiveModules);
  }, [profile?.module_preferences_set, isLoading, access?.activeModules]);

  return { showModal, setShowModal };
}