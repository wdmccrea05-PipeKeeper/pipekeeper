/**
 * StoryButton — triggers the backend-driven Collection Story viewer.
 * Uses the generateCollectionStory backend function (canonical path).
 * The old local storyEngine / useCollectorStory path has been retired.
 */

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import CollectionStoryViewer from './CollectionStoryViewer';
import { generateCollectionStoryCards } from './generateCollectionStoryCards';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useEnabledKeeperModules } from '@/components/hooks/useEnabledKeeperModules';
import { getAIEligibleModuleIds } from '@/components/utils/moduleAccess';

export default function StoryButton() {
  const { t } = useTranslation();
  const { moduleStates } = useEnabledKeeperModules();
  const [showViewer, setShowViewer] = useState(false);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    if (cards.length > 0) {
      setShowViewer(true);
      return;
    }

    setLoading(true);
    try {
      const enabledModules = getAIEligibleModuleIds(moduleStates);
      const result = await base44.functions.invoke('generateCollectionStory', { enabledModules });
      const story = result?.data || null;
      const generated = story ? generateCollectionStoryCards(story) : [];
      setCards(generated);
      if (generated.length > 0) setShowViewer(true);
    } catch (err) {
      console.warn('[StoryButton] failed to load story', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 116, 0.2), rgba(212, 175, 116, 0.1))',
          color: '#D4A574',
          border: '1px solid rgba(212, 175, 116, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <BookOpen className="w-4 h-4" />
        <span>{loading ? t('common.loading', 'Loading…') : t('home.viewStory', 'View Story')}</span>
      </button>

      {showViewer && cards.length > 0 && (
        <CollectionStoryViewer
          cards={cards}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}