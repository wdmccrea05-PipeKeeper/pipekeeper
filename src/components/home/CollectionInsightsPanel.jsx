import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BarChart3, Grid3x3, BookOpen, CalendarClock, FileText, Clock, Star, TrendingUp, DollarSign } from "lucide-react";
import PipeValuationTab from '@/components/pipes/PipeValuationTab';
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

import { differenceInMonths } from "date-fns";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function CollectionInsightsPanel({ pipes, blends, user, activeTab: externalActiveTab, onTabChange }) {
  const { t } = useTranslation();
  useCurrentUser();
  const [activeTab, setActiveTab] = useState(isAppleBuild ? "stats" : (externalActiveTab || "log"));

  useEffect(() => {
    if (externalActiveTab !== undefined) setActiveTab(externalActiveTab);
  }, [externalActiveTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Check for aging alerts — use already-fetched blends prop to avoid extra query
  const { data: agingAlertCount = 0 } = useQuery({
    queryKey: ["aging-alerts", user?.email, blends?.length],
    queryFn: async () => {
      const tobaccoBlends = blends || [];
      
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
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email }).catch(() => []);
      return profiles[0] || null;
    },
    staleTime: 10_000,
  });

  // Fetch smoking logs for Trends tab
  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 1000),
    enabled: !!user?.email,
  });

  return (
    <div className="rounded-lg" style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
    }}>
      <div className="p-7">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-xl font-semibold" style={{ 
              color: "#F5F1E7", 
              fontFamily: "'Georgia', serif",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)"
            }}>
              {isAppleBuild ? t("insights.titleInventory") : t("insights.title")}
            </h2>
            <InfoTooltip text={t("insights.tooltipSummary")} />
          </div>
          <p className="text-sm" style={{ color: "rgba(224, 216, 200, 0.8)" }}>{t("insights.subtitle")}</p>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full items-center justify-center ${isAppleBuild ? "grid-cols-1" : "grid-cols-8"} gap-0 h-20`} style={{
            background: "linear-gradient(145deg, rgba(35,24,16,0.7), rgba(28,18,12,0.85))",
            border: "1px solid rgba(140,105,65,0.2)",
            borderRadius: "0.5rem"
          }}>
            {isAppleBuild ? (
              <TabsTrigger value="stats" className="flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{t("insights.stats")}</span>
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="log" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.log")}</span>
                </TabsTrigger>
                <TabsTrigger value="reference" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <Grid3x3 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.pairingGrid")}</span>
                </TabsTrigger>
                <TabsTrigger value="rotation" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <CalendarClock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.rotation")}</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.stats")}</span>
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.trends")}</span>
                </TabsTrigger>
                <TabsTrigger value="aging" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 relative data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.aging")}</span>
                  {agingAlertCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("insights.reports")}</span>
                </TabsTrigger>
                <TabsTrigger value="valuation" className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs min-w-0 data-[state=active]:bg-amber-600/20 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent" style={{ color: "rgba(224,216,200,0.6)" }}>
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate w-full text-center leading-tight">{t("auto.components_home_CollectionInsightsPanel.valuation_bs4s54")}</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="stats" className="mt-0">
            {pipes.length === 0 && blends.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                <p className="text-[#E0D8C8]/70 mb-4">{t("insights.statsEmpty")}</p>
                <Button asChild>
                  <a href={createPageUrl('Pipes')}>{t("insights.addFirstItem")}</a>
                </Button>
              </div>
            ) : (
              <TobaccoCollectionStats user={user} blends={blends} />
            )}
          </TabsContent>

          {!isAppleBuild && (
            <>
              <TabsContent value="log" className="mt-0">
                {pipes.length === 0 || blends.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/70 mb-2">{t("empty.usageLogNoPipes")}</p>
                        <p className="text-sm text-[#E0D8C8]/60 mb-4">{t("empty.usageLogAction")}</p>
                    <div className="flex gap-3 justify-center">
                      {pipes.length === 0 && (
                        <Button asChild size="sm">
                          <a href={createPageUrl('Pipes')}>{t("tobacconist.addFirstPipe")}</a>
                        </Button>
                      )}
                      {blends.length === 0 && (
                        <Button asChild size="sm" variant="outline">
                          <a href={createPageUrl('Tobacco')}>{t("tobacconist.addFirstBlend")}</a>
                        </Button>
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
                    <p className="text-[#E0D8C8]/70 mb-2">{t("empty.rotationNoPipes")}</p>
                    <p className="text-sm text-[#E0D8C8]/60 mb-4">{t("empty.rotationAction")}</p>
                    <Button asChild size="sm">
                      <a href={createPageUrl('Pipes')}>{t("tobacconist.addFirstPipe")}</a>
                    </Button>
                  </div>
                ) : (
                  <RotationPlanner user={user} />
                )}
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                {pipes.length === 0 && blends.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#E0D8C8]/70 mb-1">{t("insights.reportsEmpty")}</p>
                    <p className="text-sm text-[#E0D8C8]/60">{t("insights.reportsEmptyDesc")}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-[#E0D8C8]">{t("insights.reports")}</h3>
                        <InfoTooltip text={t("insights.reportsTooltip")} />
                      </div>
                      <p className="text-sm text-[#E0D8C8]/70">{t("insights.reportsSubtitle")}</p>
                    </div>
                    <SmokingLogReportExporter user={user} />
                    <AgingReportExporter user={user} />
                    <CollectionReportExporter user={user} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="trends" className="mt-0">
                <ProFeatureLock featureName="Trends Report">
                  <TrendsReport 
                    logs={logs} 
                    pipes={pipes} 
                    blends={blends} 
                    user={user}
                  />
                </ProFeatureLock>
              </TabsContent>

              <TabsContent value="aging" className="mt-0">
                {blends.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                    <p className="text-[#A4B0C4] mb-2">{t("empty.agingNoBlends")}</p>
                    <p className="text-sm text-[#8F9DB3] mb-4">{t("empty.agingAction")}</p>
                    <Button asChild size="sm">
                      <a href={createPageUrl('Tobacco')}>{t("tobacconist.addFirstBlend")}</a>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-[#E0D8C8]">{t("insights.agingDashboard")}</h3>
                        <InfoTooltip text={t("insights.agingTooltip")} />
                      </div>
                      <p className="text-sm text-[#E0D8C8]/70">{t("insights.agingSubtitle")}</p>
                    </div>
                    <CellarAgingDashboard user={user} />
                  </>
                )}
              </TabsContent>

              <TabsContent value="valuation" className="mt-0">
                <PipeValuationTab pipes={pipes} blends={blends} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}