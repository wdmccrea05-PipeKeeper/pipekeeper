import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";
import AIUpdatesPanel from "@/components/ai/AIUpdatesPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { getActiveOptimizeScopes } from "@/platform/collectionCuratorAI.js";
import { getAiEligibilityStats } from "@/platform/aiEligibility.js";

const TOBACCONIST_ICON = 'https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png';

const activeScopes = getActiveOptimizeScopes();
const DEFAULT_OPTIMIZE_SCOPE = activeScopes[0]?.id ?? "pipe_tobacco_pairings";

export default function ExpertTobacconist({ pipes, blends, isPaidUser, user, userProfile, activeTab: externalActiveTab, onTabChange }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  const canOptimize = entitlements.canUse("COLLECTION_OPTIMIZATION");
  const [optimizeScope, setOptimizeScope] = useState(DEFAULT_OPTIMIZE_SCOPE);
  const [activeTab, setActiveTab] = useState(externalActiveTab ?? "optimizer");

  useEffect(() => {
    if (externalActiveTab !== undefined) setActiveTab(externalActiveTab);
  }, [externalActiveTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

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
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="optimizer" aria-label={t("tobacconist.optimize")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <TrendingUp className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("tobacconist.optimize")}</span>
            </TabsTrigger>
            <TabsTrigger value="whatif" aria-label={t("tobacconist.whatIf")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <Lightbulb className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("tobacconist.whatIf")}</span>
            </TabsTrigger>
            <TabsTrigger value="updates" aria-label={t("tobacconist.aiUpdates")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <RefreshCw className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("tobacconist.aiUpdates")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optimizer" className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("collectionCurator.optimizationTitle")}</h3>
                <InfoTooltip text={t("collectionCurator.optimizationTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("collectionCurator.optimizationSubtitle")}</p>
              {/* Module-aware scope selector */}
              <div className="flex flex-wrap gap-2 mt-3">
                {activeScopes.map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setOptimizeScope(scope.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-[32px] ${
                      optimizeScope === scope.id
                        ? "bg-[#8b3a3a] border-[#8b3a3a] text-white"
                        : "border-[#E0D8C8]/30 text-[#E0D8C8]/70 hover:border-[#E0D8C8]/50"
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>
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
                <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
              )}
            </FeatureGate>
          </TabsContent>

          <TabsContent value="whatif" className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("collectionCurator.whatIfTitle")}</h3>
                <InfoTooltip text={t("collectionCurator.whatIfTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("collectionCurator.whatIfSubtitle")}</p>
            </div>
            {canOptimize ? (
              pipes.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60 mb-4">{t("tobacconist.whatIfEmpty")}</p>
                  <div className="flex gap-3 justify-center">
                    <a href={createPageUrl('Pipes')}>
                      <Button size="sm">{t("tobacconist.addFirstPipe")}</Button>
                    </a>
                    <a href={createPageUrl('Tobacco')}>
                      <Button size="sm" variant="outline">{t("tobacconist.addFirstBlend")}</Button>
                    </a>
                  </div>
                </div>
              ) : (
                <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} improvedWhatIf={true} />
              )
            ) : (
              <p className="text-sm text-[#E0D8C8]/60 text-center py-4">
                {t("tobacconist.upgradeInOptimizeTab")}
              </p>
            )}
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("collectionCurator.updatesTitle")}</h3>
                <InfoTooltip text={t("collectionCurator.updatesTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("collectionCurator.updatesSubtitle")}</p>
            </div>
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}