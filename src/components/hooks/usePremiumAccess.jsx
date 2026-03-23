import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * @deprecated DO NOT USE. Legacy shim kept for backward compat only.
 * Use useCurrentUser() instead: const { hasPaid } = useCurrentUser()
 *
 * premium tier no longer exists — all premium users are treated as pro.
 */
export function usePremiumAccess(_user) {
  // This hook is a no-op shim. All callers should migrate to useCurrentUser().
  return {
    hasPremium: false,
    source: "free",
    isLoading: false,
    error: null,
    refetch: () => {},
    subscription: null,
  };
}