import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3x3, BookOpen } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function CollectionInsightsPanel({ pipes, blends, user }) {
  const [activeTab, setActiveTab] = useState(isAppleBuild ? "stats" : "log");

  // ✅ Fetch the same user profile used by the AI Updates panel
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles?.[0] || null;
    },
    staleTime: 10_000,
  });

  return (
    <Card className="border-[#A35C5C]/30 bg-[#243548]/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#E0D8C8] font-bold text-lg">
          {isAppleBuild ? "Inventory Insights" : "Collection Insights"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid w-full ${isAppleBuild ? "grid-cols-1" : "grid-cols-3"} mb-6 bg-white border border-[#E5E5E5]`}
          >
            {isAppleBuild ? (
              <TabsTrigger
                value="stats"
                className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Stats</span>
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger
                  value="log"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Log</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reference"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Pairing Grid</span>
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Stats</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="stats" className="mt-0">
            <TobaccoCollectionStats />
          </TabsContent>

          {!isAppleBuild && (
            <>
              <TabsContent value="log" className="mt-0">
                <SmokingLogPanel pipes={pipes} blends={blends} user={user} />
              </TabsContent>

              <TabsContent value="reference" className="mt-0">
                {/* ✅ IMPORTANT: pass same pipes/blends/profile so regen matches AI Updates exactly */}
                <PairingGrid user={user} pipes={pipes} blends={blends} profile={userProfile} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}