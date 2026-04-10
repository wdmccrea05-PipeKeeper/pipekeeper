import { useEffect, useState } from 'react';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook to determine if module selection onboarding should be shown
 * Shows only on first login/signup when module_preferences_set is false
 */
export function useModuleOnboarding() {
  const { user, isLoading } = useCurrentUser();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isLoading || !user?.email) return;

    // Show modal if user hasn't set module preferences yet
    const shouldShow = !user?.module_preferences_set;
    if (shouldShow) {
      setShowModal(true);
    }
  }, [user?.email, user?.module_preferences_set, isLoading]);

  return { showModal, setShowModal };
}