import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Sparkles, TrendingUp, Lightbulb, RefreshCw } from "lucide-react";
import QuickPipeIdentifier from "@/components/ai/QuickPipeIdentifier";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";
import AIUpdatesPanel from "@/components/ai/AIUpdatesPanel";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isAppleBuild } from "@/components/utils/appVariant";
import FeatureGate from "@/components/subscription/FeatureGate";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { enforceTranslation } from "@/components/i18n/enforceTranslation";

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';

export default function ExpertTobacconist({ pipes, blends, isPaidUser, user, userProfile }) {
  const { t } = useTranslation();
  if (isAppleBuild) return null;

  return (
    <Card>
      <CardHeader className="border-b border-[#1a2c42]/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] flex items-center justify-center shadow-lg">
            <img 
              src={TOBACCONIST_ICON}
              alt="Expert Tobacconist"
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-2xl text-[#E0D8C8]">{t("tobacconist.title")}</CardTitle>
              <Badge variant="outline" className="text-xs border-[#E0D8C8]/30 text-[#E0D8C8]/80">{t("tobacconist.optional")}</Badge>
              <InfoTooltip text={t("tobacconist.tooltipText")} />
            </div>
            <p className="text-sm text-[#E0D8C8]/70">{t("tobacconist.subtitle")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <Tabs defaultValue="identifier">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="identifier" className="flex items-center justify-center gap-1 md:gap-2">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("tobacconist.identify")}</span>
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center justify-center gap-1 md:gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("tobacconist.optimize")}</span>
            </TabsTrigger>
            <TabsTrigger value="whatif" className="flex items-center justify-center gap-1 md:gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("tobacconist.whatIf")}</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center justify-center gap-1 md:gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("tobacconist.aiUpdates")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identifier" className="mt-6">
            <div className="mb-4">
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
            )}
          </TabsContent>

          <TabsContent value="optimizer" className="mt-6">
            <div className="mb-4">
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
            </FeatureGate>
          </TabsContent>

          <TabsContent value="whatif" className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">{t("tobacconist.whatIfTitle")}</h3>
                <InfoTooltip text={t("tobacconist.whatIfTooltip")} />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">{t("tobacconist.whatIfSubtitle")}</p>
            </div>
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName={t("featureGate.whatIfAnalysisName")}
              description={t("featureGate.whatIfAnalysisDesc")}
            >
              {pipes.length === 0 ? (
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
              )}
            </FeatureGate>
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