/**
 * REACT HOOK: useAccessSummary
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * Builds and returns canonical AccessSummary.
 *
 * Usage:
 *   const access = useAccessSummary()
 *   if (access?.tier === 'pro') { ... }
 *
 * Returns null while data is loading.
 */

import { useMemo } from "react";
import { buildAccessSummary } from "@/components/access";
import { useCurrentUser } from "./useCurrentUser";
import type { AccessSummary } from "@/components/access";

export function useAccessSummary(): AccessSummary | null {
  const { user, subscription, isLoading } = useCurrentUser();

  const access = useMemo(() => {
    if (isLoading || !user) return null;
    return buildAccessSummary(user, subscription);
  }, [user, subscription, isLoading]);

  return access;
}