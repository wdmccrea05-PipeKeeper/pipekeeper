import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

/**
 * The dashboard's entry into collection health.
 *
 * One row, one number, one destination: the findings the collector can act on,
 * opening the filtered review list. Nothing is listed on the dashboard itself.
 */
export default function CollectionHealthRow({ count = 0, isLoading = false, onOpen }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,75,0.22)', minHeight: 56 }}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold break-words" style={{ color: '#F5F1E7' }}>
          {t('hub.collectionHealth')}
        </span>
        <span className="block text-xs break-words" style={{ color: 'rgba(224,216,200,0.6)' }}>
          {isLoading
            ? '—'
            : count > 0
            ? `${count} ${t('hub.findingsToReview')}`
            : t('hub.noFindings')}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#D4A574' }} />
    </button>
  );
}