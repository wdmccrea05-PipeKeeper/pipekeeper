import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Sparkles, TrendingUp, Lightbulb } from "lucide-react";
import QuickPipeIdentifier from "@/components/ai/QuickPipeIdentifier";
import PairingMatrix from "@/components/home/PairingMatrix";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/ecd65f889_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png';

export default function ExpertTobacconist({ pipes, blends, isPaidUser }) {
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
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all"
            >
              <Camera className="w-4 h-4 mr-2" />
              Identify
            </TabsTrigger>
            <TabsTrigger 
              value="pairings"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Pairings
            </TabsTrigger>
            <TabsTrigger 
              value="optimizer"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Optimize
            </TabsTrigger>
            <TabsTrigger 
              value="whatif"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] data-[state=active]:shadow-md text-[#e8d5b7]/60 hover:text-[#e8d5b7] rounded-lg transition-all"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              What If
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identifier" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <QuickPipeIdentifier pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="pairings" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <PairingMatrix pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
          </TabsContent>

          <TabsContent value="whatif" className="space-y-4 bg-[#1a2c42]/40 p-4 rounded-xl border border-[#e8d5b7]/20">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} improvedWhatIf={true} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}