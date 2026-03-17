import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { aggregateCollection } from '@/components/keeper-core/aggregation/collectionAggregation';
import CollectionInsightsCard, { CollectionInsightsShareModal } from '@/components/sharing/CollectionInsightsCard';

export default function CollectionInsightsSharePage() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
  const variant = location.state?.variant || 'hub';

  const { data: summary = null } = useQuery({
    queryKey: ['collection-share-summary', user?.email],
    queryFn: () => aggregateCollection(user?.email),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: userProfile = null } = useQuery({
    queryKey: ['share-user-profile', user?.email],
    queryFn: async () => {
      const byEmail = await base44.entities.UserProfile.filter({ user_email: user?.email }).catch(() => []);
      const byCreatedBy = await base44.entities.UserProfile.filter({ created_by: user?.email }).catch(() => []);
      return [...byEmail, ...byCreatedBy][0] || null;
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{
            color: '#F5F1E7',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontFamily: "'Georgia', serif",
          }}
        >
          Your Shareable Card
        </h1>
      </div>

      <div className="flex justify-center">
        <CollectionInsightsCard summary={summary} userProfile={userProfile} variant={variant} />
      </div>

      <div className="flex justify-center">
        <Button
          onClick={() => setShowShareModal(true)}
          className="bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] hover:from-[#8B4A4A] hover:to-[#A35C5C] gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Collection Insights
        </Button>
      </div>

      <CollectionInsightsShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        summary={summary}
        userProfile={userProfile}
        variant={variant}
      />
    </div>
  );
}
