import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { scopedEntities } from "@/components/api/scopedEntities";

import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import PairingGrid from "@/components/home/PairingGrid";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";

export default function Home() {
  const { user, isLoading, error } = useCurrentUser();

  const { data: pipes = [] } = useQuery({
    queryKey: ["home-pipes", user?.email],
    queryFn: () => scopedEntities.Pipe.listForUser(user?.email),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["home-blends", user?.email],
    queryFn: () => scopedEntities.TobaccoBlend.listForUser(user?.email),
    enabled: !!user?.email,
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-[#E0D8C8]/80">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm text-red-300">
          Home error: {String(error?.message || error)}
        </div>
      </div>
    );
  }

  const tier = String(user?.subscription_tier || "free").toUpperCase();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="text-3xl font-bold text-[#E0D8C8]">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </div>
          <div className="text-sm text-[#E0D8C8]/70 mt-2">
            Tier: <span className="font-medium text-[#E0D8C8]">{tier}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <TobaccoCollectionStats />
            <PairingGrid user={user} pipes={pipes} blends={blends} />
          </div>

          <div className="space-y-4">
            <CollectionInsightsPanel user={user} pipes={pipes} blends={blends} />
            <SmokingLogPanel user={user} pipes={pipes} blends={blends} />
          </div>
        </div>
      </div>
    </div>
  );
}