import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PKCard, PKHeader } from "@/components/ui/pk-surface";
import { BarChart3, Grid3x3, BookOpen, CalendarClock, FileText, Clock, Star } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import CellarAgingDashboard from "@/components/tobacco/CellarAgingDashboard";
import CollectionReportExporter from "@/components/export/CollectionReportExporter";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";
import RotationPlanner from "@/components/pipes/RotationPlanner";
import { isAppleBuild } from "@/components/utils/appVariant";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Download } from "lucide-react";
import { differenceInMonths } from "date-fns";

export default function CollectionInsightsPanel({ pipes, blends, user }) {
  const [activeTab, setActiveTab] = useState(isAppleBuild ? "stats" : "log");

  // Check for aging alerts
  const { data: agingAlertCount = 0 } = useQuery({
    queryKey: ["aging-alerts", user?.email],
    queryFn: async () => {
      const tobaccoBlends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      
      const cellarBlends = tobaccoBlends.filter(b => {
        const hasCellared = (b.tin_tins_cellared || 0) > 0 || 
                            (b.bulk_cellared || 0) > 0 || 
                            (b.pouch_pouches_cellared || 0) > 0;
        return hasCellared;
      });

      let alertCount = 0;
      cellarBlends.forEach(b => {
        const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
        const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null;
        
        if (oldestDate) {
          const months = differenceInMonths(new Date(), oldestDate);
          const potential = b.aging_potential;
          
          // Alert if tobacco has reached optimal aging
          if (potential === "Excellent" && months >= 24) alertCount++;
          else if (potential === "Good" && months >= 12) alertCount++;
          else if (potential === "Fair" && months >= 3) alertCount++;
        }
      });
      
      return alertCount;
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

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
    <PKCard>
      <div className="p-6">
        <PKHeader 
          title={isAppleBuild ? "Inventory Insights" : "Collection Insights"}
          className="mb-4"
        />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAppleBuild ? "grid-cols-1" : "grid-cols-6"}`}>
            {isAppleBuild ? (
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Stats</span>
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="log" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Log</span>
                </TabsTrigger>
                <TabsTrigger value="reference" className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Pairing Grid</span>
                </TabsTrigger>
                <TabsTrigger value="rotation" className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  <span className="hidden sm:inline">Rotation</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="aging" className="flex items-center gap-2 relative">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Aging</span>
                  {agingAlertCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="absolute text-[10px] font-bold text-white">{agingAlertCount}</span>
                    </div>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
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
                  <div className="text-sm mb-4">
                    Download collection reports, exports, and comprehensive analysis documents.
                  </div>
                  <CollectionReportExporter user={user} />
                  <p className="text-xs opacity-70 mt-4">
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
      </div>
    </PKCard>
  );
}