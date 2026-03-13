import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCollectionInsights } from '@/components/sharing/useCollectionInsights';
import CollectionInsightsCard, { CollectionInsightsShareModal } from '@/components/sharing/CollectionInsightsCard';

export default function CollectionInsightsSharePage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const [showShareModal, setShowShareModal] = useState(false);

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date'),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const byEmail = await base44.entities.UserProfile.filter({ user_email: user?.email }).catch(() => []);
      const byCreatedBy = await base44.entities.UserProfile.filter({ created_by: user?.email }).catch(() => []);
      const all = [...byEmail, ...byCreatedBy];
      const seen = new Set();
      const unique = all.filter((r) => {
        const key = r?.id || `${r?.user_id || ""}|${r?.user_email || ""}|${r?.created_by || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const sorted = unique.sort((a, b) =>
        (Date.parse(b.updated_date ?? b.updated_at ?? b.created_date ?? "") || 0) -
        (Date.parse(a.updated_date ?? a.updated_at ?? a.created_date ?? "") || 0)
      );
      return sorted[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const insights = useCollectionInsights(pipes, blends, smokingLogs);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 
          className="text-4xl font-bold tracking-tight"
          style={{ 
            color: '#F5F1E7',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            fontFamily: "'Georgia', serif"
          }}
        >
          Collection Insights
        </h1>
        <p 
          className="text-base max-w-2xl mx-auto leading-relaxed"
          style={{ color: 'rgba(224, 216, 200, 0.75)' }}
        >
          Generate and share a visual summary of your pipe collection statistics.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{
          background: 'linear-gradient(135deg, rgba(163, 92, 92, 0.15), rgba(163, 92, 92, 0.08))',
          border: '1px solid rgba(163, 92, 92, 0.3)',
        }}>
          <CardContent className="pt-6">
            <div 
              className="text-3xl font-bold"
              style={{ color: '#A35C5C' }}
            >
              {pipes.length}
            </div>
            <p 
              className="text-sm mt-2"
              style={{ color: 'rgba(224, 216, 200, 0.6)' }}
            >
              Pipes in Collection
            </p>
          </CardContent>
        </Card>

        <Card style={{
          background: 'linear-gradient(135deg, rgba(90, 124, 90, 0.15), rgba(90, 124, 90, 0.08))',
          border: '1px solid rgba(90, 124, 90, 0.3)',
        }}>
          <CardContent className="pt-6">
            <div 
              className="text-3xl font-bold"
              style={{ color: '#5A7C5A' }}
            >
              {blends.length}
            </div>
            <p 
              className="text-sm mt-2"
              style={{ color: 'rgba(224, 216, 200, 0.6)' }}
            >
              Tobacco Blends
            </p>
          </CardContent>
        </Card>

        <Card style={{
          background: 'linear-gradient(135deg, rgba(180, 140, 75, 0.15), rgba(180, 140, 75, 0.08))',
          border: '1px solid rgba(180, 140, 75, 0.3)',
        }}>
          <CardContent className="pt-6">
            <div 
              className="text-3xl font-bold"
              style={{ color: '#B48C4B' }}
            >
              {insights.totalBowlsLogged}
            </div>
            <p 
              className="text-sm mt-2"
              style={{ color: 'rgba(224, 216, 200, 0.6)' }}
            >
              Bowls Logged
            </p>
          </CardContent>
        </Card>

        <Card style={{
          background: 'linear-gradient(135deg, rgba(100, 80, 60, 0.15), rgba(100, 80, 60, 0.08))',
          border: '1px solid rgba(100, 80, 60, 0.3)',
        }}>
          <CardContent className="pt-6">
            <div 
              className="text-3xl font-bold"
              style={{ color: '#C87941' }}
            >
              {Math.round(insights.cellarSize)}
            </div>
            <p 
              className="text-sm mt-2"
              style={{ color: 'rgba(224, 216, 200, 0.6)' }}
            >
              oz Cellared
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Preview */}
      <div className="text-center space-y-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: '#F5F1E7' }}
        >
          Your Shareable Card
        </h2>
        <div className="flex justify-center">
          <CollectionInsightsCard insights={insights} userProfile={userProfile} />
        </div>

        <Button 
          onClick={() => setShowShareModal(true)}
          className="bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] hover:from-[#8B4A4A] hover:to-[#A35C5C] gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Collection Insights
        </Button>
      </div>

      {/* Share Modal */}
      <CollectionInsightsShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        insights={insights}
        userProfile={userProfile}
      />
    </div>
  );
}