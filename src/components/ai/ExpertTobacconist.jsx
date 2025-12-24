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
    <Card className="border-[#e8d5b7]/30 bg-gradient-to-br from-[#1a2c42] to-[#243548]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#8b3a3a] flex items-center justify-center">
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
      <CardContent>
        <Tabs defaultValue="identifier" className="space-y-4">
          <TabsList className="grid grid-cols-4 bg-[#243548] border border-[#e8d5b7]/20">
            <TabsTrigger 
              value="identifier"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] text-[#e8d5b7]/60"
            >
              <Camera className="w-4 h-4 mr-2" />
              Identify
            </TabsTrigger>
            <TabsTrigger 
              value="pairings"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] text-[#e8d5b7]/60"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Pairings
            </TabsTrigger>
            <TabsTrigger 
              value="optimizer"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] text-[#e8d5b7]/60"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Optimize
            </TabsTrigger>
            <TabsTrigger 
              value="whatif"
              className="data-[state=active]:bg-[#8b3a3a] data-[state=active]:text-[#e8d5b7] text-[#e8d5b7]/60"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              What If
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identifier" className="space-y-4">
            <QuickPipeIdentifier pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="pairings" className="space-y-4">
            <PairingMatrix pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-4">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={false} />
          </TabsContent>

          <TabsContent value="whatif" className="space-y-4">
            <CollectionOptimizer pipes={pipes} blends={blends} showWhatIf={true} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}