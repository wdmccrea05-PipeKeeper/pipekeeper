import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, RefreshCw, Brain, MessageSquare } from "lucide-react";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";
import AIUpdatesPanel from "@/components/ai/AIUpdatesPanel";
import CuratorForYouPanel from "@/components/curator/CuratorForYouPanel";
import CuratorWorkspace from "@/components/curator/CuratorWorkspace";
import { isAppleBuild } from "@/components/utils/appVariant";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { getActiveOptimizeScopes } from "@/components/platform/collectionCuratorAI";
import { getAiEligibilityStats } from "@/components/platform/aiEligibility";

const TOBACCONIST_ICON = 'https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png';

const activeScopes = getActiveOptimizeScopes();
const DEFAULT_OPTIMIZE_SCOPE = activeScopes[0]?.id ?? "pipe_tobacco_pairings";

export default function ExpertTobacconist({ pipes, blends, isPaidUser, user, userProfile, activeTab: externalActiveTab, onTabChange }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  const canOptimize = entitlements.canUse("COLLECTION_OPTIMIZATION");
  const [optimizeScope, setOptimizeScope] = useState(DEFAULT_OPTIMIZE_SCOPE);
  const [activeTab, setActiveTab] = useState(externalActiveTab ?? "for_you");
  const [curatorPreFill, setCuratorPreFill] = useState("");

  // Read prefilled prompt from URL on mount (normalize legacy tab= params)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const promptFromUrl = params.get("prompt");
      const legacyTab = params.get("tab");
      
      // Legacy routing cleanup: whatif, ask → curator
      if (legacyTab === "whatif" || legacyTab === "ask") {
        setActiveTab("curator");
      }
      
      if (promptFromUrl) {
        setCuratorPreFill(promptFromUrl);
        setActiveTab("curator");
      }
      
      // Clean URL after reading
      if (promptFromUrl || legacyTab === "whatif" || legacyTab === "ask") {
        params.delete("prompt");
        params.delete("tab");
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      console.error("Error reading URL params:", e);
    }
  }, []);

  useEffect(() => {
    if (externalActiveTab !== undefined) setActiveTab(externalActiveTab);
  }, [externalActiveTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  // When a "For You" insight triggers curator interaction
  const handleOpenCuratorFromInsight = useCallback((insight) => {
    if (insight?.whatif_prompt) {
      setCuratorPreFill(insight.whatif_prompt);
    } else if (insight) {
      setCuratorPreFill(`${insight.title}. ${insight.summary}`);
    }
    handleTabChange("curator");
  }, [handleTabChange]);

  if (isAppleBuild) return null;

  const pipeStats = getAiEligibilityStats(pipes || []);
  const blendStats = getAiEligibilityStats(blends || []);
  const totalExcluded = pipeStats.excluded + blendStats.excluded;

  return (
    <Card>
      <CardHeader className="border-b border-[#1a2c42]/20">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] flex items-center justify-center shadow-lg flex-shrink-0">
            <img 
              src={TOBACCONIST_ICON}
              alt={t("tobacconist.expertTobacconistAlt")}
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-base sm:text-xl text-[#E0D8C8] leading-tight">{t("collectionCurator.systemTitle")}</CardTitle>
              <Badge variant="outline" className="text-xs border-[#E0D8C8]/30 text-[#E0D8C8]/80 shrink-0">{t("tobacconist.optional")}</Badge>
              <InfoTooltip text={t("collectionCurator.tooltipText")} />
            </div>
            <p className="text-sm text-[#E0D8C8]/70">{t("collectionCurator.subtitle")}</p>
            {totalExcluded > 0 && (
              <p className="text-xs text-[#E0D8C8]/50 mt-1">
                {t("collectionCurator.excludedNote", { count: totalExcluded })}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="for_you" aria-label={t("curator.forYouTitle")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <Brain className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("curator.forYouTitle")}</span>
            </TabsTrigger>
            <TabsTrigger value="optimizer" aria-label={t("curator.optimizeTitle")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("curator.optimizeTitle")}</span>
            </TabsTrigger>
            <TabsTrigger value="curator" aria-label={t("curator.curatorTitle")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("curator.curatorTitle")}</span>
            </TabsTrigger>
            <TabsTrigger value="updates" aria-label={t("curator.updatesTitle")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("curator.updatesTitle")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="for_you" className="mt-6">
            <CuratorForYouPanel
              pipes={pipes}
              blends={blends}
              onAskCurator={handleOpenCuratorFromInsight}
              onOpenWhatIf={handleOpenCuratorFromInsight}
            />
          </TabsContent>

          <TabsContent value="optimizer" className="mt-6">
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName={t("featureGate.collectionOptimizationName")}
              description={t("featureGate.collectionOptimizationDesc")}
            >
              {pipes.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60 mb-4">{t("tobacconist.optimizationEmpty")}</p>
                  <a href={createPageUrl('Pipes')}>
                    <Button size="sm">{t("tobacconist.addFirstPipe")}</Button>
                  </a>
                </div>
              ) : (
                <CollectionOptimizer 
                  pipes={pipes} 
                  blends={blends} 
                  showWhatIf={false}
                  onExploreWithCurator={(suggestion) => {
                    setCuratorPreFill(suggestion?.prompt || suggestion?.rationale || "");
                    handleTabChange("curator");
                  }}
                />
              )}
            </FeatureGate>
          </TabsContent>

          <TabsContent value="curator" className="mt-6">
            <CuratorWorkspace
              pipes={pipes}
              blends={blends}
              preFilledPrompt={curatorPreFill}
              onPromptConsumed={() => setCuratorPreFill("")}
            />
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}