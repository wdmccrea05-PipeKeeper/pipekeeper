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
    <Card className="border-[#e8d5b7]/30 bg-[#243548]/80 backdrop-blur-sm rounded-2xl shadow-xl">
      <CardHeader className="border-b border-[#e8d5b7]/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] flex items-center justify-center shadow-lg">
            <img 
              src={TOBACCONIST_ICON}
              alt="Expert Tobacconist"
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <div>
            <CardTitle className="text-2xl text-[#e8d5b7]">Expert Tobacconist</CardTitle>
            <p className="text-sm text-[#e8d5b7]/70">AI-powered collection analysis and recommendations</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="identifier" className="space-y-6">
          <TabsList className="grid grid-cols-4 bg-[#1a2c42]/60 border border-[#e8d5b7]/30 p-1 rounded-xl shadow-inner">
            <TabsTrigger 
              value="identifier"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all flex items-center justify-center gap-1 md:gap-2"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Identify</span>
            </TabsTrigger>
            <TabsTrigger 
              value="optimizer"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all flex items-center justify-center gap-1 md:gap-2"
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Optimize</span>
            </TabsTrigger>
            <TabsTrigger 
              value="whatif"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all flex items-center justify-center gap-1 md:gap-2"
            >
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">What If</span>
            </TabsTrigger>
            <TabsTrigger 
              value="updates"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all flex items-center justify-center gap-1 md:gap-2"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">AI Updates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identifier" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <QuickPipeIdentifier pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
          </TabsContent>

          <TabsContent value="whatif" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} improvedWhatIf={true} />
          </TabsContent>

          <TabsContent value="updates" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <AIUpdatesPanel pipes={pipes} blends={blends} profile={userProfile} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}