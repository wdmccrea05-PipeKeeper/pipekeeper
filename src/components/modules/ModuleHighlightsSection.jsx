/**
 * ModuleHighlightsSection — shared Collection Highlights grid used by every module homepage.
 *
 * Renders a consistent section heading and a uniform card grid using InsightHighlightCard
 * so all module homepages (PipeKeeper, WhiskeyKeeper, CigarKeeper, WineKeeper) share the
 * same aspect ratio, card height, border radius, typography, object-cover image behaviour,
 * gradient overlay, hover behaviour, and grid layout.
 *
 * Props:
 *   title       string            — section heading (defaults to i18n 'home.highlights')
 *   highlights  Array<{
 *     key       string            — React key
 *     title     string            — card label (e.g. "Most Valuable")
 *     value     string            — primary display value
 *     subtitle  string            — secondary line
 *     accent    string            — hex colour for this card
 *     photo     string|null       — background image URL
 *     onClick   function|null     — card click handler
 *   }>
 *   accent      string            — fallback accent for section label colour
 */
import React from 'react';
import InsightHighlightCard from '@/components/insights/InsightHighlightCard';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function ModuleHighlightsSection({ title, highlights = [], accent }) {
  const { t } = useTranslation();
  if (!highlights.length) return null;

  const sectionTitle = title || t('home.highlights');

  return (
    <div>
      <h2
        className="text-xs font-semibold uppercase tracking-[0.14em] mb-4"
        style={{ color: accent || 'rgba(180,140,75,0.8)' }}
      >
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {highlights.map((h) => (
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
    </div>
  );
}
