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

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';

export default function ExpertTobacconist({ pipes, blends, isPaidUser, user, userProfile }) {
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
              <CardTitle className="text-2xl">Expert Tobacconist</CardTitle>
              <Badge variant="outline" className="text-xs">Optional</Badge>
              <InfoTooltip text="Optional tools that help organize entries and surface patterns from your saved data." />
            </div>
            <p className="text-sm opacity-70">Optional advanced organization tools</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <Tabs defaultValue="identifier">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="identifier" className="flex items-center justify-center gap-1 md:gap-2">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Identify</span>
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center justify-center gap-1 md:gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Optimize</span>
            </TabsTrigger>
            <TabsTrigger value="whatif" className="flex items-center justify-center gap-1 md:gap-2">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">What If</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center justify-center gap-1 md:gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">AI Updates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identifier" className="mt-6">
            {pipes.length === 0 && blends.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                <p className="text-[#E0D8C8]/60">AI tools work best once your collection has data.</p>
              </div>
            ) : (
              <QuickPipeIdentifier pipes={pipes} blends={blends} />
            )}
          </TabsContent>

          <TabsContent value="optimizer" className="mt-6">
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="Collection Optimization"
              description="Get AI-powered analysis of your collection with specialization recommendations, gap identification, and what-if scenario planning with Pro or legacy Premium access."
            >
              {pipes.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60">AI tools work best once your collection has data.</p>
                </div>
              ) : (
                <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
              )}
            </FeatureGate>
          </TabsContent>

          <TabsContent value="whatif" className="mt-6">
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="What-If Analysis"
              description="Ask collection strategy questions and run what-if scenarios with AI assistance. Available with Pro or legacy Premium access."
            >
              {pipes.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60">AI tools work best once your collection has data.</p>
                </div>
              ) : (
                <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} improvedWhatIf={true} />
              )}
            </FeatureGate>
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}