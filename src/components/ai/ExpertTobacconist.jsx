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
              <CardTitle className="text-2xl text-[#E0D8C8]">Expert Tobacconist</CardTitle>
              <Badge variant="outline" className="text-xs border-[#E0D8C8]/30 text-[#E0D8C8]/80">Optional</Badge>
              <InfoTooltip text="Optional tools that help organize entries and surface patterns from your saved data." />
            </div>
            <p className="text-sm text-[#E0D8C8]/70">Optional advanced organization tools</p>
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
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#E0D8C8]">Pipe & Tobacco Identification</h3>
                <InfoTooltip text="Upload photos of pipes or tobacco tins to identify maker, model, blend details, and approximate values using AI visual analysis." />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">Identify items from photos</p>
            </div>
            {pipes.length === 0 && blends.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                <p className="text-[#E0D8C8]/60 mb-4">AI identification works once you have items to analyze</p>
                <div className="flex gap-3 justify-center">
                  <a href={createPageUrl('Pipes')}>
                    <Button size="sm">Add First Pipe</Button>
                  </a>
                  <a href={createPageUrl('Tobacco')}>
                    <Button size="sm" variant="outline">Add First Blend</Button>
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
                <h3 className="text-base font-semibold text-[#E0D8C8]">Collection Optimization</h3>
                <InfoTooltip text="AI analyzes your collection to recommend pipe specializations, identify gaps, and suggest next additions for a balanced collection." />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">Optimize pipe focus and identify collection gaps</p>
            </div>
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="Collection Optimization"
              description="Get AI-powered analysis of your collection with specialization recommendations, gap identification, and what-if scenario planning with Pro or legacy Premium access."
            >
              {pipes.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60 mb-4">Optimization requires pipes in your collection</p>
                  <a href={createPageUrl('Pipes')}>
                    <Button size="sm">Add First Pipe</Button>
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
                <h3 className="text-base font-semibold text-[#E0D8C8]">What-If Scenarios</h3>
                <InfoTooltip text="Explore hypothetical changes before making them. Ask questions like 'Should I buy a Dublin for Latakia?' and get AI-guided recommendations." />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">Explore collection strategy scenarios</p>
            </div>
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="What-If Analysis"
              description="Ask collection strategy questions and run what-if scenarios with AI assistance. Available with Pro or legacy Premium access."
            >
              {pipes.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-[#E0D8C8]/30 mx-auto mb-3" />
                  <p className="text-[#E0D8C8]/60 mb-4">What-if scenarios require pipes and tobacco data</p>
                  <div className="flex gap-3 justify-center">
                    <a href={createPageUrl('Pipes')}>
                      <Button size="sm">Add First Pipe</Button>
                    </a>
                    <a href={createPageUrl('Tobacco')}>
                      <Button size="sm" variant="outline">Add First Blend</Button>
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
                <h3 className="text-base font-semibold text-[#E0D8C8]">AI Updates</h3>
                <InfoTooltip text="Run one-time AI operations to update geometry classifications, find verified specs, regenerate pairings, or refresh break-in schedules." />
              </div>
              <p className="text-sm text-[#E0D8C8]/60">Update classifications and recommendations</p>
            </div>
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}