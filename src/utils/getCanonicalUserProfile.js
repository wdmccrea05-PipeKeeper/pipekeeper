/**
 * getCanonicalUserProfile — single source of truth for UserProfile reads.
 *
 * Problem: Multiple UserProfile rows can exist for the same user (created
 * by different code paths using user_id vs user_email).
 *
 * Solution: Query both, sort by updated_date DESC, return the newest row.
 * All profile writes must go through this row's ID.
 */

import { base44 } from "@/api/base44Client";

const normEmail = (e) => String(e || "").trim().toLowerCase();

/**
 * Fetch the canonical (most recently updated) UserProfile for the current user.
 *
 * @param {object} options
 * @param {string} [options.userId]    - Auth user ID
 * @param {string} [options.userEmail] - User email (normalized)
 * @returns {Promise<{profile: object|null, profileId: string|null}>}
 */
export async function getCanonicalUserProfile({ userId, userEmail } = {}) {
  const email = normEmail(userEmail);
  let records = [];

  // Try by user_id first (most reliable)
  if (userId) {
    try {
      const byId = await base44.entities.UserProfile.filter({ user_id: userId });
      if (Array.isArray(byId)) records.push(...byId);
    } catch {}
  }

  // Also try by email (catches legacy rows created before user_id was stored)
  if (email) {
    try {
      const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
      if (Array.isArray(byEmail)) records.push(...byEmail);
    } catch {}
  }

  if (!records.length) {
    return { profile: null, profileId: null };
  }

  // Deduplicate by ID
  const seen = new Set();
  const unique = records.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Sort by updated_date DESC → pick newest
  const sorted = unique.sort((a, b) => {
    const ad = Date.parse(a?.updated_date || a?.created_date || "") || 0;
    const bd = Date.parse(b?.updated_date || b?.created_date || "") || 0;
    return bd - ad;
  });

  const profile = sorted[0];
  return { profile, profileId: profile.id };
}

/**
 * React-friendly hook wrapper.
 * Import this in components that need the canonical profile.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

export function useCanonicalProfile() {
  const { user: authUser } = useAuth();

  const userId = authUser?.id || authUser?.auth_user_id;
  const userEmail = authUser?.email ? normEmail(authUser.email) : null;

  return useQuery({
    queryKey: ["canonical-profile", userId || userEmail],
    queryFn: () => getCanonicalUserProfile({ userId, userEmail }),
    enabled: !!(userId || userEmail),
    staleTime: 5 * 60 * 1000,
  });
}