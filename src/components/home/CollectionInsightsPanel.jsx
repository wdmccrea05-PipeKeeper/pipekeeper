import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3x3, BookOpen } from "lucide-react";
import PairingGrid from "@/components/home/PairingGrid";
import TobaccoCollectionStats from "@/components/home/TobaccoCollectionStats";
import SmokingLogPanel from "@/components/home/SmokingLogPanel";

export default function CollectionInsightsPanel({ pipes, blends, user }) {
  const [activeTab, setActiveTab] = useState('reference');

  return (
    <Card className="border-[#e8d5b7]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#e8d5b7]">Collection Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="reference" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reference</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="log" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reference" className="mt-0">
            <PairingGrid pipes={pipes} blends={blends} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <TobaccoCollectionStats />
          </TabsContent>

          <TabsContent value="log" className="mt-0">
            <SmokingLogPanel pipes={pipes} blends={blends} user={user} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}