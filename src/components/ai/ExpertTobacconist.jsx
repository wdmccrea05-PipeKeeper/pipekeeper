import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import QuickPipeIdentifier from "@/components/ai/QuickPipeIdentifier";
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

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';
const DEFAULT_TAB = 'identifier';

function getRequestedTab() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = (params.get('tab') || '').toLowerCase();
    if (['identifier', 'optimizer', 'whatif', 'updates', 'curator', 'ask'].includes(tab)) {
      if (tab === 'curator' || tab === 'ask') return 'whatif';
      return tab;
    }
    return DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

function getRequestedPrompt() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('prompt') || '').trim();
  } catch {
    return '';
  }
}

function clearConsumedRouteState() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('prompt');
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

export default function ExpertTobacconist({ pipes, blends, isPaidUser, user, userProfile }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  const canOptimize = entitlements.canUse("COLLECTION_OPTIMIZATION");
  const [activeTab, setActiveTab] = useState(getRequestedTab());
  const [routedPrompt, setRoutedPrompt] = useState(getRequestedPrompt());
  const shouldAutoSubmit = useMemo(() => activeTab === 'whatif' && !!routedPrompt, [activeTab, routedPrompt]);

  useEffect(() => {
    const nextPrompt = getRequestedPrompt();
    const nextTab = getRequestedTab();
    if (nextPrompt) {
      setActiveTab(nextTab || 'whatif');
      setRoutedPrompt(nextPrompt);
    }
  }, []);

  if (isAppleBuild) return null;

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
              <CardTitle className="text-base sm:text-xl text-[#E0D8C8] leading-tight">{t("tobacconist.title")}</CardTitle>
              <Badge variant="outline" className="text-xs border-[#E0D8C8]/30 text-[#E0D8C8]/80 shrink-0">{t("tobacconist.optional")}</Badge>
              <InfoTooltip text={t("tobacconist.tooltipText")} />
            </div>
            <p className="text-sm text-[#E0D8C8]/70">{t("tobacconist.subtitle")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="identifier" aria-label={t("tobacconist.identify")} className="flex items-center justify-center gap-1.5 px-2 py-2 min-w-0">
              <Camera className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{t("tobacconist.identify")}</span>
            </TabsTrigger>
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

          <TabsContent value="identifier" className="mt-6"> <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("tobacconist.identificationTitle")}</h3>
                <InfoTooltip text={t("tobacconist.identificationTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("tobacconist.identificationSubtitle")}</p>
            </div>
            {pipes.length === 0 && blends.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                <p className="text-[#E0D8C8]/60 mb-4">{t("tobacconist.identificationEmpty")}</p>
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
              <QuickPipeIdentifier pipes={pipes} blends={blends} />
            )} </TabsContent>
          <TabsContent value="optimizer" className="mt-6"> <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("tobacconist.optimizationTitle")}</h3>
                <InfoTooltip text={t("tobacconist.optimizationTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("tobacconist.optimizationSubtitle")}</p>
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
            </FeatureGate> </TabsContent>
          <TabsContent value="whatif" className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("tobacconist.whatIfTitle")}</h3>
                <InfoTooltip text={t("tobacconist.whatIfTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("tobacconist.whatIfSubtitle")}</p>
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
                <CollectionOptimizer
                  pipes={pipes}
                  blends={blends}
                  showWhatIf={true}
                  improvedWhatIf={true}
                  prefilledPrompt={routedPrompt}
                  autoSubmitPrompt={shouldAutoSubmit}
                  onAutoSubmitComplete={() => {
                    clearConsumedRouteState();
                    setRoutedPrompt('');
                  }}
                />
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
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("tobacconist.updatesTitle")}</h3>
                <InfoTooltip text={t("tobacconist.updatesTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("tobacconist.updatesSubtitle")}</p>
            </div>
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}