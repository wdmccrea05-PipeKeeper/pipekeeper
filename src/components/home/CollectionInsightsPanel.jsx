import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PKCard, PKHeader } from "@/components/ui/pk-surface";
import { BarChart3, Grid3x3, BookOpen, CalendarClock, FileText, Clock, Star } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import CellarAgingDashboard from "@/components/tobacco/CellarAgingDashboard";
import CollectionReportExporter from "@/components/export/CollectionReportExporter";
import SmokingLogReportExporter from "@/components/export/SmokingLogReportExporter";
import AgingReportExporter from "@/components/export/AgingReportExporter";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";
import RotationPlanner from "@/components/pipes/RotationPlanner";
import TrendsReport from "@/components/tobacco/TrendsReport";
import { isAppleBuild } from "@/components/utils/appVariant";
import ProFeatureLock from "@/components/subscription/ProFeatureLock";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Download } from "lucide-react";
import { differenceInMonths } from "date-fns";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function CollectionInsightsPanel({ pipes, blends, user }) {
  const { t } = useTranslation();
  const { hasPro } = useCurrentUser();
  const [activeTab, setActiveTab] = useState(isAppleBuild ? "stats" : "log");

  // Check for aging alerts
  const { data: agingAlertCount = 0 } = useQuery({
    queryKey: ["aging-alerts", user?.email],
    queryFn: async () => {
      const tobaccoBlends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      
      const cellarBlends = (tobaccoBlends || []).filter(b => {
       if (!b) return false;
       const hasCellared = (Number(b.tin_tins_cellared) || 0) > 0 || 
                           (Number(b.bulk_cellared) || 0) > 0 || 
                           (Number(b.pouch_pouches_cellared) || 0) > 0;
       return hasCellared;
      });

      let alertCount = 0;
      cellarBlends.forEach(b => {
        if (!b) return;
        const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
        const oldestDate = dates.length > 0 ? dates.reduce((oldest, d) => {
          try {
            const dTime = new Date(d).getTime();
            const oldTime = new Date(oldest).getTime();
            if (Number.isNaN(dTime) || Number.isNaN(oldTime)) return oldest;
            return dTime < oldTime ? d : oldest;
          } catch {
            return oldest;
          }
        }) : null;

       if (oldestDate) {
         try {
           const parsed = new Date(oldestDate);
           if (Number.isNaN(parsed.getTime())) return;
           const months = differenceInMonths(new Date(), parsed);
           const potential = b.aging_potential;

           // Alert if tobacco has reached optimal aging
           if (potential === "Excellent" && months >= 24) alertCount++;
           else if (potential === "Good" && months >= 12) alertCount++;
           else if (potential === "Fair" && months >= 3) alertCount++;
         } catch {
           // ignore invalid dates
         }
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

  // Fetch smoking logs for Trends tab
  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 1000),
    enabled: !!user?.email && hasPro,
  });

  return (
    <PKCard>
      <div className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <PKHeader 
              title={isAppleBuild ? t("insights.titleInventory") : t("insights.title")}
              className="mb-0"
            />
            <InfoTooltip text={t("insights.tooltipSummary")} />
          </div>
          <p className="text-sm text-[#E0D8C8]/60">{t("insights.subtitle")}</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAppleBuild ? "grid-cols-1" : "grid-cols-7"}`}>
            {isAppleBuild ? (
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{t("insights.stats")}</span>
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="log" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.log")}</span>
                </TabsTrigger>
                <TabsTrigger value="reference" className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.pairingGrid")}</span>
                </TabsTrigger>
                <TabsTrigger value="rotation" className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.rotation")}</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.stats")}</span>
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.trends")}</span>
                </TabsTrigger>
                <TabsTrigger value="aging" className="flex items-center gap-2 relative">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.aging")}</span>
                  {agingAlertCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="absolute text-[10px] font-bold text-white">{agingAlertCount}</span>
                    </div>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.reports")}</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="stats" className="mt-0">
            {pipes.length === 0 && blends.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                <p className="text-[#E0D8C8]/60 mb-4">{t("insights.statsEmpty")}</p>
                <a href={createPageUrl('Pipes')}>
                  <Button>{t("insights.addFirstItem")}</Button>
                </a>
              </div>
            ) : (
              <TobaccoCollectionStats />
            )}
          </TabsContent>

          {!isAppleBuild && (
            <>
              <TabsContent value="log" className="mt-0">
                {pipes.length === 0 || blends.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/60 mb-2">{t("empty.usageLogNoPipes")}</p>
                    <p className="text-sm text-[#E0D8C8]/40 mb-4">{t("empty.usageLogAction")}</p>
                    <div className="flex gap-3 justify-center">
                      {pipes.length === 0 && (
                        <a href={createPageUrl('Pipes')}>
                          <Button size="sm">{t("tobacconist.addFirstPipe")}</Button>
                        </a>
                      )}
                      {blends.length === 0 && (
                        <a href={createPageUrl('Tobacco')}>
                          <Button size="sm" variant="outline">{t("tobacconist.addFirstBlend")}</Button>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <SmokingLogPanel pipes={pipes} blends={blends} user={user} />
                )}
              </TabsContent>

              <TabsContent value="reference" className="mt-0">
                {/* ✅ IMPORTANT: pass same pipes/blends/profile so regen matches AI Updates exactly */}
                <PairingGrid user={user} pipes={pipes} blends={blends} profile={userProfile} />
              </TabsContent>

              <TabsContent value="rotation" className="mt-0">
                {pipes.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarClock className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/60 mb-2">{t("empty.rotationNoPipes")}</p>
                    <p className="text-sm text-[#E0D8C8]/40 mb-4">{t("empty.rotationAction")}</p>
                    <a href={createPageUrl('Pipes')}>
                      <Button size="sm">{t("tobacconist.addFirstPipe")}</Button>
                    </a>
                  </div>
                ) : (
                  <RotationPlanner user={user} />
                )}
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                {pipes.length === 0 && blends.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/60 mb-1">{t("insights.reportsEmpty")}</p>
                    <p className="text-sm text-[#E0D8C8]/40">{t("insights.reportsEmptyDesc")}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-[#E0D8C8]">{t("insights.reports", {defaultValue: "Reports"})}</h3>
                        <InfoTooltip text="Generate exportable summaries of your collection for reference or documentation." />
                      </div>
                      <p className="text-sm text-[#E0D8C8]/60">{t("insights.reportsSubtitle", {defaultValue: "Export your collection and smoking logs"})}</p>
                    </div>
                    <SmokingLogReportExporter user={user} />
                    <AgingReportExporter user={user} />
                    <CollectionReportExporter user={user} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-0">
                {hasPro ? (
                  <TrendsReport 
                    logs={logs} 
                    pipes={pipes} 
                    blends={blends} 
                    user={user}
                  />
                ) : (
                  <ProFeatureLock featureName="Trends Report">
                    <TrendsReport 
                      logs={[]} 
                      pipes={pipes} 
                      blends={blends} 
                      user={user}
                    />
                  </ProFeatureLock>
                )}
              </TabsContent>

              <TabsContent value="aging" className="mt-0">
                {blends.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/60 mb-2">{t("empty.agingNoBlends")}</p>
                    <p className="text-sm text-[#E0D8C8]/40 mb-4">{t("empty.agingAction")}</p>
                    <a href={createPageUrl('Tobacco')}>
                      <Button size="sm">{t("tobacconist.addFirstBlend")}</Button>
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-[#E0D8C8]">{t("insights.agingDashboard", {defaultValue: "Aging Dashboard"})}</h3>
                        <InfoTooltip text="Monitor cellared tobacco and get recommendations on optimal aging times based on blend characteristics." />
                      </div>
                      <p className="text-sm text-[#E0D8C8]/60">{t("insights.agingSubtitle", {defaultValue: "Track cellared tobacco aging progress"})}</p>
                    </div>
                    <CellarAgingDashboard user={user} />
                  </>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PKCard>
  );
}