import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TobaccoCardSkeleton() {
  return (
    <Card className="overflow-hidden border-stone-200">
      <div className="flex gap-4 p-4">
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TobaccoCardSkeletonList({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <TobaccoCardSkeleton key={i} />
      ))}
    </div>
  );
}