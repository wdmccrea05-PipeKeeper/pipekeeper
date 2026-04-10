import { useEffect, useState } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

/**
 * Hook to determine if module selection onboarding should be shown.
 *
 * - module_preferences_set is read from UserProfile via useModuleVisibility (canonical source).
 * - Shows the modal on every load until the user completes module selection.
 *   Refresh-suppression for the post-selection onboarding flow is handled
 *   separately by OnboardingRouter via pk_auto_launch_onboarding.
 */
export function useModuleOnboarding() {
  const { profile, isLoading } = useModuleVisibility();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setShowModal(profile?.module_preferences_set !== true);
  }, [profile?.module_preferences_set, isLoading]);

  return { showModal, setShowModal };
}