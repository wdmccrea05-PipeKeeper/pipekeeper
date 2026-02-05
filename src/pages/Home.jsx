import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function Home() {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();

  const email = currentUser?.email;

  // Pull the canonical profile (NOT entities.User)
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["homeUserProfile", email],
    enabled: Boolean(email),
    queryFn: async () => {
      const rows = await base44.entities.UserProfile.filter({ user_email: email });
      return rows?.[0] || null;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const tier = useMemo(() => {
    return (
      userProfile?.subscription_tier ||
      currentUser?.subscription_tier ||
      "FREE"
    );
  }, [userProfile, currentUser]);

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm opacity-80">Loading…</div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-red-300">
          Login error: {String(userError?.message || userError)}
        </div>
      </div>
    );
  }

  // --- Your existing Home UI below ---
  // IMPORTANT: wherever Home previously used `userRecord` from entities.User,
  // replace it with `userProfile` and/or `currentUser`.
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <div className="text-2xl font-semibold">Welcome{currentUser?.name ? `, ${currentUser.name}` : ""}</div>
          <div className="text-sm opacity-80">
            Tier: <span className="font-medium">{tier}</span>
          </div>
        </div>

        {/* KEEP the rest of your existing Home content/components exactly as-is */}
        {/* Just ensure nothing references base44.entities.User anywhere. */}
      </div>
    </div>
  );
}