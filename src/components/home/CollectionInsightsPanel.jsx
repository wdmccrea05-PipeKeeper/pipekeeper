import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Grid3x3,
  CalendarClock,
  BarChart3,
  Clock,
  FileText,
  Star,
} from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";

import ProFeatureLock from "@/components/subscription/ProFeatureLock";
import InfoTooltip from "@/components/ui/InfoTooltip";
import SmokingLogPanel from "./SmokingLogPanel";
import UsageStatsPanel from "./UsageStatsPanel";
import PairingGrid from "./PairingGrid";
import CellarAgingDashboard from "@/components/tobacco/CellarAgingDashboard";

export default function CollectionInsightsPanel({
  userEmail,
  user,
  pipes = [],
  blends = [],
  isAppleBuild = false,
}) {
  const { t } = useTranslation();
  const [agingAlertCount, setAgingAlertCount] = useState(0);

  const { data: entitlements } = useQuery({
    queryKey: ["entitlements"],
    queryFn: async () => {
      try {
        const res = await base44.auth.me();
        return res?.user || null;
      } catch {
        return null;
      }
    },
  });

  const hasPro =
    String(entitlements?.entitlement_tier || "").toLowerCase() === "pro";

  useEffect(() => {
    // Aging dashboard can update this via callback if you later wire it in.
    // For now keep existing behavior.
  }, []);

  const tabs = useMemo(() => {
    if (isAppleBuild) {
      return [
        {
          id: "stats",
          icon: BarChart3,
          label: t("insights.tabs.stats", { defaultValue: "Stats" }),
        },
      ];
    }

    return [
      {
        id: "log",
        icon: BookOpen,
        label: t("insights.tabs.usageLog", { defaultValue: "Usage Log" }),
      },
      {
        id: "reference",
        icon: Grid3x3,
        label: t("insights.tabs.pairingGrid", { defaultValue: "Pairing Grid" }),
      },
      {
        id: "rotation",
        icon: CalendarClock,
        label: t("insights.tabs.rotation", { defaultValue: "Rotation" }),
      },
      {
        id: "stats",
        icon: BarChart3,
        label: t("insights.tabs.stats", { defaultValue: "Stats" }),
      },
      {
        id: "trends",
        icon: BarChart3,
        label: t("insights.tabs.trends", { defaultValue: "Trends" }),
      },
      {
        id: "aging",
        icon: Clock,
        label: t("insights.tabs.aging", { defaultValue: "Aging" }),
      },
      {
        id: "reports",
        icon: FileText,
        label: t("insights.tabs.reports", { defaultValue: "Reports" }),
      },
    ];
  }, [isAppleBuild, t]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[#E0D8C8]">
              {t("insights.title", { defaultValue: "Collection Insights" })}
            </h2>
            <InfoTooltip
              text={t("insights.overviewTooltip", {
                defaultValue:
                  "This section summarizes patterns and totals across your collection based on the data you've entered.",
              })}
            />
          </div>
        </div>

        <Tabs defaultValue={tabs[0]?.id || "stats"}>
          <TabsList className="w-full bg-[#0F1C2E]/40">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {!isAppleBuild && (
            <>
              <TabsContent value="log" className="pt-4">
                <div className="text-center py-8 text-[#E0D8C8]/60">
                  {t("common.comingSoon", { defaultValue: "Coming soon" })}
                </div>
              </TabsContent>

              <TabsContent value="reference" className="pt-4">
                <div className="text-center py-8 text-[#E0D8C8]/60">
                  {t("common.comingSoon", { defaultValue: "Coming soon" })}
                </div>
              </TabsContent>

              <TabsContent value="rotation" className="pt-4">
                <div className="text-center py-8 text-[#E0D8C8]/60">
                  {t("common.comingSoon", { defaultValue: "Coming soon" })}
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="stats" className="pt-4">
            <div className="text-center py-8 text-[#E0D8C8]/60">
              {t("common.comingSoon", { defaultValue: "Coming soon" })}
            </div>
          </TabsContent>

          {!isAppleBuild && (
            <>
              <TabsContent value="trends" className="pt-4">
                {hasPro ? (
                  <div className="text-center py-8 text-[#E0D8C8]/60">
                    {t("common.comingSoon", { defaultValue: "Coming soon" })}
                  </div>
                ) : (
                  <ProFeatureLock
                    featureName={t("insights.pro.trendsTitle", {
                      defaultValue: "Trends Report",
                    })}
                  >
                    <div className="text-center py-8 text-[#E0D8C8]/60">
                      {t("common.comingSoon", { defaultValue: "Coming soon" })}
                    </div>
                  </ProFeatureLock>
                )}
              </TabsContent>

              <TabsContent value="aging" className="pt-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[#E0D8C8]">
                      {t("insights.tabs.aging", { defaultValue: "Aging" })}
                    </h3>
                    <InfoTooltip
                      text={t("insights.agingTooltip", {
                        defaultValue:
                          "Monitor cellared tobacco and get recommendations on optimal aging times based on blend characteristics.",
                      })}
                    />
                    {agingAlertCount > 0 && (
                      <div className="relative ml-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                          {agingAlertCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[#E0D8C8]/60">
                    {t("insights.subtitle", {
                      defaultValue:
                        "Track usage, optimize pairings, and monitor your collection",
                    })}
                  </p>
                </div>

                <div className="text-center py-8 text-[#E0D8C8]/60">
                  {t("common.comingSoon", { defaultValue: "Coming soon" })}
                </div>
              </TabsContent>

              <TabsContent value="reports" className="pt-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[#E0D8C8]">
                      {t("insights.reportsTitle", {
                        defaultValue: "Reports",
                      })}
                    </h3>
                    <InfoTooltip
                      text={t("insights.exportTooltip", {
                        defaultValue:
                          "Generate exportable summaries of your collection for reference or documentation.",
                      })}
                    />
                  </div>
                  <p className="text-sm text-[#E0D8C8]/60">
                    {t("insights.reportsSubtitle", {
                      defaultValue: "Export your collection and smoking logs",
                    })}
                  </p>
                </div>
                
                <div className="text-center py-8 text-[#E0D8C8]/60">
                  {t("common.comingSoon", { defaultValue: "Coming soon" })}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}