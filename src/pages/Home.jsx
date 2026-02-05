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
      "free"
    );
  }, [userProfile, currentUser]);

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-[#E0D8C8]/80">Loading…</div>
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

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="text-3xl font-bold text-[#E0D8C8]">
            Welcome{currentUser?.name ? `, ${currentUser.name}` : ""}
          </div>
          <div className="text-sm text-[#E0D8C8]/70 mt-2">
            Tier: <span className="font-medium text-[#E0D8C8]">{String(tier)}</span>
          </div>
        </div>

        {/* Dashboard cards placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#1A2B3A]/50 border border-[#A35C5C]/30 rounded-lg p-6">
            <div className="text-[#E0D8C8]/70 text-sm">Collection Overview</div>
            <div className="text-[#E0D8C8] text-lg font-semibold mt-2">Coming Soon</div>
          </div>
          <div className="bg-[#1A2B3A]/50 border border-[#A35C5C]/30 rounded-lg p-6">
            <div className="text-[#E0D8C8]/70 text-sm">Smoking Stats</div>
            <div className="text-[#E0D8C8] text-lg font-semibold mt-2">Coming Soon</div>
          </div>
          <div className="bg-[#1A2B3A]/50 border border-[#A35C5C]/30 rounded-lg p-6">
            <div className="text-[#E0D8C8]/70 text-sm">Recommendations</div>
            <div className="text-[#E0D8C8] text-lg font-semibold mt-2">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}