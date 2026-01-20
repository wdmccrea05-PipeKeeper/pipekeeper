import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3x3, BookOpen, CalendarClock, FileText, Wine } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import CellarAgingDashboard from "@/components/tobacco/CellarAgingDashboard";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";
import RotationPlanner from "@/components/pipes/RotationPlanner";
import { isAppleBuild } from "@/components/utils/appVariant";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Download } from "lucide-react";

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
            className={`grid w-full ${isAppleBuild ? "grid-cols-1" : "grid-cols-6"} mb-6 bg-white border border-[#E5E5E5]`}
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
                  value="rotation"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span className="hidden sm:inline">Rotation</span>
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Stats</span>
                </TabsTrigger>
                <TabsTrigger
                  value="aging"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <Wine className="w-4 h-4" />
                  <span className="hidden sm:inline">Aging</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="flex items-center gap-2 text-[#666666] data-[state=active]:text-[#000000] data-[state=active]:bg-white"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Reports</span>
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

              <TabsContent value="rotation" className="mt-0">
                <RotationPlanner user={user} />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <div className="space-y-4">
                  <div className="text-sm text-white mb-4">
                    Download collection reports, exports, and comprehensive analysis documents.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a href={createPageUrl('UserReport')} target="_blank">
                      <Button variant="outline" className="w-full justify-start border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10">
                        <Download className="w-4 h-4 mr-2" />
                        Full Collection Report
                      </Button>
                    </a>
                    <Button variant="outline" className="w-full justify-start border-[#1e3a5f]/30 text-[#2c4f7c] hover:bg-[#1e3a5f]/10" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Cellar Aging Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-[#1e3a5f]/30 text-[#2c4f7c] hover:bg-[#1e3a5f]/10" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Pipe Valuation PDF
                    </Button>
                    <Button variant="outline" className="w-full justify-start border-[#1e3a5f]/30 text-[#2c4f7c] hover:bg-[#1e3a5f]/10" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Smoking History
                    </Button>
                  </div>
                  <p className="text-xs text-white/80 mt-4">
                    Additional report formats coming soon.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="aging" className="mt-0">
                <CellarAgingDashboard user={user} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}