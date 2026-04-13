import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Copy, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { aggregateCollection } from '@/components/keeper-core/aggregation/collectionAggregation';
import BrandLogo from '@/components/branding/BrandLogo';
import { useCurrency } from '@/lib/currency/useCurrency';

function Divider() {
  return (
    <div
      className="w-full h-px"
      style={{ background: 'linear-gradient(to right, transparent, rgba(180,140,75,0.22), transparent)' }}
    />
  );
}

function StatPill({ label, value, color }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <span className="text-2xl font-bold tabular-nums" style={{ color, fontFamily: "'Georgia', serif" }}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest mt-1 text-center" style={{ color: 'rgba(224,216,200,0.48)' }}>
        {label}
      </span>
    </div>
  );
}

function CardShell({ children, cardRef }) {
  return (
    <div
      ref={cardRef}
      className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #2e2016 0%, #1a1210 55%, #1f1713 100%)',
        border: '2px solid rgba(180,140,75,0.28)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(180,140,75,0.1)',
      }}
    >
      {/* Top accent */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, rgba(180,140,75,0) 0%, rgba(180,140,75,0.75) 50%, rgba(180,140,75,0) 100%)' }}
      />
      {children}
      {/* Footer brand */}
      <Divider />
      <div className="px-6 py-3 flex items-center justify-center gap-2">
        <BrandLogo compact showWordmark={false} imageClassName="w-4 h-4" />
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.3)', letterSpacing: '0.08em' }}>
          CollectionKeeper
        </span>
      </div>
    </div>
  );
}

// Card 1 — Cover
function CoverCard({ summary, userProfile, cardRef }) {
  const { formatFromBase } = useCurrency();
  const pipes = summary?.pipes?.count ?? 0;
  const blends = summary?.tobacco?.count ?? 0;
  const bottles = summary?.whiskey?.count ?? 0;
  const value = Math.round(summary?.total?.value || 0);

  return (
    <CardShell cardRef={cardRef}>
      <div className="px-8 pt-10 pb-8 text-center space-y-5">
        <BrandLogo showWordmark={false} imageClassName="w-16 h-16 mx-auto" />
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {userProfile?.display_name ? `${userProfile.display_name}'s Collection` : 'My Collection'}
          </h2>
          <p className="text-xs uppercase tracking-widest mt-2" style={{ color: 'rgba(180,140,75,0.55)' }}>
            A Collector's Snapshot
          </p>
        </div>
        <Divider />
        <div className="grid grid-cols-2 gap-3">
          {pipes > 0 && <StatPill label="Pipes" value={pipes} color="#A35C5C" />}
          {blends > 0 && <StatPill label="Blends" value={blends} color="#5A7C5A" />}
          {bottles > 0 && <StatPill label="Bottles" value={bottles} color="#C87941" />}
          {value > 0 && (
            <StatPill
              label="Total Value"
              value={formatFromBase(value)}
              color="#10B981"
            />
          )}
        </div>
      </div>
    </CardShell>
  );
}

// Card 2 — PipeKeeper highlights
function PipeCard({ summary, cardRef }) {
  const pipes = summary?.pipes?.count ?? 0;
  const blends = summary?.tobacco?.count ?? 0;
  const sessions = summary?.total?.sessions ?? 0;
  const topPipe = summary?.highlights?.mostUsedPipe;
  const topBlend = summary?.highlights?.mostCellaredBlend || summary?.raw?.tobaccos?.[0];
  const cellarOz = summary?.raw?.tobaccos?.reduce((sum, b) => {
    return sum + (Number(b?.tin_total_quantity_oz) || 0) + (Number(b?.bulk_total_quantity_oz) || 0);
  }, 0)?.toFixed?.(0) ?? '0';

  return (
    <CardShell cardRef={cardRef}>
      <div className="px-7 py-7 space-y-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(180,140,75,0.6)' }}>
            PipeKeeper
          </p>
          <h3 className="text-lg font-bold mt-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Pipe Collection
          </h3>
        </div>
        <Divider />
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Pipes" value={pipes} color="#A35C5C" />
          <StatPill label="Blends" value={blends} color="#5A7C5A" />
          <StatPill label="Sessions" value={sessions} color="#8B5CF6" />
        </div>
        {cellarOz > 0 && (
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(90,124,90,0.12)', border: '1px solid rgba(90,124,90,0.22)' }}
          >
            <span className="text-lg font-bold" style={{ color: '#7AAA68' }}>{cellarOz} oz</span>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>Cellared Tobacco</p>
          </div>
        )}
        <Divider />
        <div className="space-y-3">
          {topPipe && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(180,140,75,0.55)' }}>Top Pipe</span>
              <span className="text-sm font-semibold text-right" style={{ color: '#F5F1E7', maxWidth: '60%', wordBreak: 'break-word' }}>{topPipe.name}</span>
            </div>
          )}
          {topBlend && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(180,140,75,0.55)' }}>Top Blend</span>
              <span className="text-sm font-semibold text-right" style={{ color: '#F5F1E7', maxWidth: '60%', wordBreak: 'break-word' }}>{topBlend.name}</span>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

// Card 3 — WhiskeyKeeper highlights
function WhiskeyCard({ summary, cardRef }) {
  const { formatFromBase } = useCurrency();
  const bottles = summary?.whiskey?.count ?? 0;
  const tastings = summary?.total?.tastings ?? 0;
  const value = Math.round(summary?.whiskey?.value || 0);
  const topBottle = summary?.highlights?.mostValuedBottle;
  const avgRating = summary?.whiskey?.avgRating;
  const totalBottles = summary?.whiskey?.totalBottles ?? bottles;

  return (
    <CardShell cardRef={cardRef}>
      <div className="px-7 py-7 space-y-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(180,140,75,0.6)' }}>
            WhiskeyKeeper
          </p>
          <h3 className="text-lg font-bold mt-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Whiskey Collection
          </h3>
        </div>
        <Divider />
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Bottle Types" value={bottles} color="#C87941" />
          <StatPill label="Total Bottles" value={totalBottles} color="#D4A574" />
          <StatPill label="Tastings" value={tastings} color="#8B5CF6" />
          {value > 0 && (
            <StatPill
              label="Value"
              value={formatFromBase(value)}
              color="#10B981"
            />
          )}
        </div>
        <Divider />
        <div className="space-y-3">
          {topBottle && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs uppercase tracking-widest flex-shrink-0" style={{ color: 'rgba(180,140,75,0.55)' }}>Crown Jewel</span>
              <span className="text-sm font-semibold text-right" style={{ color: '#F5F1E7', maxWidth: '60%', wordBreak: 'break-word' }}>{topBottle.name}</span>
            </div>
          )}
          {avgRating && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(180,140,75,0.55)' }}>Avg Rating</span>
              <span className="text-sm font-semibold" style={{ color: '#F59E0B' }}>{'⭐'.repeat(Math.round(Number(avgRating)))} {avgRating}/5</span>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

const STORY_CARDS = [
  { id: 'cover', label: 'Cover' },
  { id: 'pipe', label: 'PipeKeeper' },
  { id: 'whiskey', label: 'WhiskeyKeeper' },
];

export default function CollectionInsightsSharePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const location = useLocation();
  const variant = location.state?.variant || 'hub';

  const [currentCard, setCurrentCard] = useState(0);
  const cardRef = useRef(null);

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

  // Only show cards relevant to what user has
  const visibleCards = STORY_CARDS.filter(c => {
    if (c.id === 'pipe' && !(summary?.pipes?.count > 0 || summary?.tobacco?.count > 0)) return false;
    if (c.id === 'whiskey' && !(summary?.whiskey?.count > 0)) return false;
    return true;
  });

  const handleDownload = async () => {
    if (!cardRef.current) return toast.error('Card not ready');
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1210',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `collectionkeeper-${visibleCards[currentCard]?.id || 'card'}-${Date.now()}.png`;
      link.click();
      toast.success('Image downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download image');
    }
  };

  const handleCopyText = async () => {
    const pipes = summary?.pipes?.count || 0;
    const blends = summary?.tobacco?.count || 0;
    const bottles = summary?.whiskey?.count || 0;
    const value = Math.round(summary?.total?.value || 0);
    const text = `My CollectionKeeper collection:\n${pipes} pipes, ${blends} blends, ${bottles} bottles.\nTotal collection value: ${formatFromBase(value)}.`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const activeCard = visibleCards[currentCard]?.id || 'cover';

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      {/* Back */}
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Title */}
      <div className="text-center space-y-1">
        <h1
          className="text-2xl font-bold"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          Share Your Collection Story
        </h1>
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
          Swipe through cards, then download or copy to share.
        </p>
      </div>

      {/* Card navigator pills */}
      {visibleCards.length > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {visibleCards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCurrentCard(i)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: currentCard === i ? 'rgba(180,140,75,0.22)' : 'rgba(255,255,255,0.04)',
                border: currentCard === i ? '1px solid rgba(180,140,75,0.55)' : '1px solid rgba(120,90,65,0.22)',
                color: currentCard === i ? 'rgba(212,180,100,1)' : 'rgba(224,216,200,0.5)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Active card */}
      {!summary ? (
        <div className="text-center py-12" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Loading your collection…
        </div>
      ) : (
        <>
          {activeCard === 'cover' && <CoverCard summary={summary} userProfile={userProfile} cardRef={cardRef} />}
          {activeCard === 'pipe' && <PipeCard summary={summary} cardRef={cardRef} />}
          {activeCard === 'whiskey' && <WhiskeyCard summary={summary} cardRef={cardRef} />}
        </>
      )}

      {/* Prev / Next */}
      {visibleCards.length > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentCard === 0}
            onClick={() => setCurrentCard(i => Math.max(0, i - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {currentCard + 1} / {visibleCards.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentCard === visibleCards.length - 1}
            onClick={() => setCurrentCard(i => Math.min(visibleCards.length - 1, i + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" size="sm" onClick={handleCopyText}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Text
        </Button>
        <Button size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download Card
        </Button>
      </div>
    </div>
  );
}