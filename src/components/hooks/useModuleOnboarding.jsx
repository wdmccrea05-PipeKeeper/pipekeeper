import { useEffect, useState } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

export function useModuleOnboarding() {
  const { profile, isLoading } = useModuleVisibility();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const shouldShow = profile?.module_preferences_set !== true;
    setShowModal(shouldShow);
  }, [profile?.module_preferences_set, isLoading]);

  return { showModal, setShowModal };
}