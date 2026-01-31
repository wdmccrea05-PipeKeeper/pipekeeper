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

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';

export default function ExpertTobacconist({ pipes, blends, isPaidUser }) {
  if (isAppleBuild) return null;

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

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
            <CardTitle className="text-2xl">Expert Tobacconist</CardTitle>
            <p className="text-sm text-stone-800 dark:text-stone-300">AI-powered collection analysis and recommendations</p>
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
            <QuickPipeIdentifier pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="optimizer" className="mt-6">
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="Collection Optimization"
              description="Get AI-powered analysis of your collection with specialization recommendations, gap identification, and what-if scenario planning with Pro or legacy Premium access."
            >
              <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="whatif" className="mt-6">
            <FeatureGate 
              feature="COLLECTION_OPTIMIZATION"
              featureName="What-If Analysis"
              description="Ask collection strategy questions and run what-if scenarios with AI assistance. Available with Pro or legacy Premium access."
            >
              <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} improvedWhatIf={true} />
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