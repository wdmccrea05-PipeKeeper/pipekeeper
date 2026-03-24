import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Loader2 } from 'lucide-react';

export default function SmokingLogLoadingState() {
  return (
    <Card className="border-[rgba(140,105,65,0.35)] bg-[linear-gradient(145deg,rgba(40,28,20,0.95),rgba(32,22,15,0.95))] shadow-[0_10px_28px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(200,160,110,0.12)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[#E0D8C8]">
              <Flame className="w-5 h-5" />
              <span className="flex items-center gap-2">
                Loading...
                <Loader2 className="w-4 h-4 animate-spin" />
              </span>
            </CardTitle>
            <p className="text-sm text-[#E0D8C8]/70 mt-1">Checking your access...</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 bg-[rgba(255,255,255,0.08)]" />
          <Skeleton className="h-4 w-24 bg-[rgba(255,255,255,0.08)]" />
          <Skeleton className="h-4 w-40 bg-[rgba(255,255,255,0.08)]" />
        </div>
      </CardContent>
    </Card>
  );
}