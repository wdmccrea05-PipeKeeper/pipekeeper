/**
 * ModuleStorySection — shared module story section used by every module homepage.
 *
 * Renders a consistent "My [Module] Story" block with:
 *   1. Section heading (title prop) + Share button aligned right
 *   2. Narrative card (prose text block)
 *   3. Optional story image highlight cards using InsightHighlightCard
 *      (same visual as ModuleHighlightsSection — ensures image cards appear in every story)
 *
 * Props:
 *   title           string          — section heading e.g. "My WineKeeper Story"
 *   narrative       ReactNode       — prose content rendered inside the styled narrative card
 *   storyHighlights Array           — same shape as ModuleHighlightsSection highlights (optional)
 *   accent          string          — hex colour used for the narrative card border/bg tint
 *   onShare         function|null   — if provided, a Share button is rendered top-right
 */
import React from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InsightHighlightCard from '@/components/insights/InsightHighlightCard';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function ModuleStorySection({
  title,
  narrative,
  storyHighlights = [],
  accent = '#D4A574',
  onShare,
}) {
  const { t } = useTranslation();
  if (!narrative && storyHighlights.length === 0) return null;

  return (
    <div>
      {/* Heading row */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'rgba(180,140,75,0.8)' }}
        >
          {title}
        </h2>
        {onShare && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onShare}
            className="text-xs hover:bg-white/5"
            style={{ color: accent }}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            {t('common.share')}
          </Button>
        )}
      </div>

      {/* Narrative prose card */}
      {narrative && (
        <div
          className="rounded-xl p-5 mb-5"
          style={{
            background: `${accent}14`,
            border: `1px solid ${accent}33`,
          }}
        >
          <div
            className="text-sm leading-relaxed space-y-3"
            style={{ color: 'rgba(224,216,200,0.85)' }}
          >
            {narrative}
          </div>
        </div>
      )}

      {/* Story image highlight cards — same card as ModuleHighlightsSection */}
      {storyHighlights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storyHighlights.map((h) => (
            <InsightHighlightCard
              key={h.key}
              title={h.title}
              value={h.value}
              subtitle={h.subtitle}
              accent={h.accent}
              photo={h.photo}
              onClick={h.onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
