import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BrandLogo from '@/components/branding/BrandLogo';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { getAIEligibleModuleIds } from '@/components/utils/moduleAccess';

const METRIC_COLORS = {
  pipes: '#A35C5C',
  blends: '#5A7C5A',
  bottles: '#C87941',
  value: '#10B981',
};

function MetricBox({ value, label, color }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 px-2">
      <span
        className="text-3xl sm:text-4xl font-bold tabular-nums leading-none"
        style={{
          color,
          textShadow: `0 0 18px ${color}44`,
          fontFamily: "'Georgia', serif",
        }}
      >
        {value}
      </span>
      <span
        className="text-xs uppercase tracking-widest font-medium"
        style={{ color: 'rgba(224,216,200,0.5)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
    </div>
  );
}

function HighlightRow({ label, value, sub }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span
        className="text-xs uppercase tracking-widest flex-shrink-0 pt-0.5"
        style={{ color: 'rgba(180,140,75,0.65)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <div className="text-right min-w-0">
        <div
          className="text-sm font-semibold truncate"
          style={{ color: '#F5F1E7' }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="w-full h-px my-2"
      style={{ background: 'linear-gradient(to right, transparent, rgba(180,140,75,0.2), transparent)' }}
    />
  );
}

export default function CollectionStoryCard() {
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { moduleStates } = useEnabledKeeperModules();

  useEffect(() => { loadStory(); }, [moduleStates]);

  async function loadStory() {
    setLoading(true);
    try {
      const enabledModules = getAIEligibleModuleIds(moduleStates);
      const result = await base44.functions.invoke('generateCollectionStory', { enabledModules });
      if (result?.data) setStory(result.data);
    } catch (e) {
      console.error('Story load error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(145deg, rgba(42,30,20,0.85), rgba(28,18,12,0.95))',
          border: '1px solid rgba(180,140,75,0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          minHeight: '260px',
        }}
      >
        <Sparkles className="w-5 h-5 animate-pulse" style={{ color: 'rgba(180,140,75,0.6)' }} />
        <span className="text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          Composing your collection story…
        </span>
      </div>
    );
  }

  if (!story) return null;

  const h = story.highlights || {};
  const m = story.metrics || {};

  const valueDisplay = m.totalValue >= 1000
    ? `$${(m.totalValue / 1000).toFixed(1)}k`
    : `$${m.totalValue || 0}`;

  const hasHighlights = h.mostUsedPipe || h.favoriteBlend || h.mostTastedBottle || h.mostValuableItem;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(42,30,20,0.92), rgba(28,18,12,0.97))',
        border: '1px solid rgba(180,140,75,0.22)',
        boxShadow: '0 6px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,75,0.08)',
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'rgba(180,140,75,0.6)', letterSpacing: '0.12em' }}
          >
            Collection Story
          </p>
          <h3
            className="text-xl font-bold"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            Your Collector's Snapshot
          </h3>
        </div>
        <button
          onClick={loadStory}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-white/5"
          title="Regenerate story"
        >
          <RotateCcw className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.55)' }} />
        </button>
      </div>

      <Divider />

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(180,140,75,0.08)' }}>
        {m.pipes > 0 && <MetricBox value={m.pipes} label="Pipes" color={METRIC_COLORS.pipes} />}
        {m.blends > 0 && <MetricBox value={m.blends} label="Blends" color={METRIC_COLORS.blends} />}
        {m.bottles > 0 && <MetricBox value={m.bottles} label="Bottles" color={METRIC_COLORS.bottles} />}
        <MetricBox value={valueDisplay} label="Value" color={METRIC_COLORS.value} />
      </div>

      <Divider />

      {/* Narrative */}
      <div className="px-6 py-5">
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'rgba(224,216,200,0.78)', fontStyle: 'italic' }}
        >
          {story.narrative}
        </p>
      </div>

      {/* Highlights */}
      {hasHighlights && (
        <>
          <Divider />
          <div className="px-6 pb-2">
            {h.mostUsedPipe && (
              <HighlightRow
                label="Most Used Pipe"
                value={h.mostUsedPipe.name}
                sub={h.mostUsedPipe.uses > 0 ? `${h.mostUsedPipe.uses} sessions` : null}
              />
            )}
            {h.favoriteBlend && (
              <HighlightRow
                label="Top Blend"
                value={h.favoriteBlend.name}
                sub={h.favoriteBlend.rating ? `★ ${h.favoriteBlend.rating} / 5` : null}
              />
            )}
            {h.mostTastedBottle && (
              <HighlightRow
                label="Most Tasted"
                value={h.mostTastedBottle.name}
                sub={h.mostTastedBottle.tastings > 0 ? `${h.mostTastedBottle.tastings} tastings` : null}
              />
            )}
            {h.mostValuableItem && (
              <HighlightRow
                label="Crown Jewel"
                value={h.mostValuableItem.name}
                sub={h.mostValuableItem.value > 0 ? `$${h.mostValuableItem.value.toLocaleString()}` : null}
              />
            )}
          </div>
        </>
      )}

      <Divider />

      {/* Actions */}
      <div className="px-6 pb-6 pt-4 flex gap-3">
        <Button
          onClick={() => navigate('/CollectionInsightsShare', { state: { story } })}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          Share
        </Button>
        <Button
          onClick={loadStory}
          size="sm"
          className="flex-1"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,0.85), rgba(140,100,60,0.95))',
            border: '1px solid rgba(180,140,75,0.4)',
            color: '#F5F1E7',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Regenerate
        </Button>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 flex items-center justify-center gap-2 border-t"
        style={{ borderColor: 'rgba(180,140,75,0.1)' }}
      >
        <BrandLogo compact showWordmark={false} imageClassName="w-5 h-5" />
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.3)', letterSpacing: '0.06em' }}>
          Tracked with CollectionKeeper
        </span>
      </div>
    </div>
  );
}