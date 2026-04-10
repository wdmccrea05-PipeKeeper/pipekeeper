import { useEffect, useRef, useState } from "react";
import { useModuleVisibility } from "@/components/hooks/useModuleVisibility";

const SESSION_GATE_KEY = "pk_onboarding_session_shown";

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

/**
 * Hook to determine if module selection onboarding should be shown.
 *
 * - module_preferences_set is read from UserProfile via useModuleVisibility (canonical source).
 * - A session gate (sessionStorage) prevents onboarding from re-launching on normal page refresh
 *   after it has already been shown once in the current browser session.
 */
export function useModuleOnboarding() {
  const { profile, isLoading } = useModuleVisibility();
  const [showModal, setShowModal] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (resolvedRef.current) return;

    const prefsSet = profile?.module_preferences_set === true;

    if (prefsSet) {
      // Prefs already saved — clear any stale session gate and never show.
      safeSessionSet(SESSION_GATE_KEY, "done");
      setShowModal(false);
      resolvedRef.current = true;
      return;
    }

    // Prefs not set. Only auto-launch once per browser session to prevent
    // repeated pop-ups on refresh when the user has not yet completed selection.
    if (safeSessionGet(SESSION_GATE_KEY) === "shown") {
      setShowModal(false);
      resolvedRef.current = true;
      return;
    }

    // First time this session — show the modal and mark the gate.
    safeSessionSet(SESSION_GATE_KEY, "shown");
    setShowModal(true);
    resolvedRef.current = true;
  }, [isLoading, profile?.module_preferences_set]);

  return { showModal, setShowModal };
}