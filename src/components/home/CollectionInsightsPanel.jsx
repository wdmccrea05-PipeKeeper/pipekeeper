import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3x3, BookOpen } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";

export default function CollectionInsightsPanel({ pipes, blends, user }) {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <Card className="border-[#A35C5C]/30 bg-[#243548]/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#E0D8C8] font-bold text-lg">Collection Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#1A2B3A] border border-[#A35C5C]/30">
            <TabsTrigger value="log" className="flex items-center gap-2 text-[#E0D8C8]/70 data-[state=active]:text-[#E0D8C8] data-[state=active]:bg-[#A35C5C]/30">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-2 text-[#E0D8C8]/70 data-[state=active]:text-[#E0D8C8] data-[state=active]:bg-[#A35C5C]/30">
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden sm:inline">Pairing Grid</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2 text-[#E0D8C8]/70 data-[state=active]:text-[#E0D8C8] data-[state=active]:bg-[#A35C5C]/30">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-0">
            <SmokingLogPanel pipes={pipes} blends={blends} user={user} />
          </TabsContent>

          <TabsContent value="reference" className="mt-0">
            <PairingGrid user={user} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <TobaccoCollectionStats />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}