/**
 * Story Button Component
 * Displays "View Story" button on home/collections
 */

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import StoryViewer from './StoryViewer';
import { useCollectorStory } from './useCollectorStory';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function StoryButton() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { data: cards = [] } = useCollectorStory(user);
  const [showViewer, setShowViewer] = useState(false);

  if (!cards || cards.length === 0) {
    return null; // Don't show button if no story to display
  }

  const handleShare = async (currentCard, currentIndex) => {
    // Get the card element for export
    const cardElement = document.querySelector('[data-story-card]');
    if (!cardElement) {
      toast.error(t("story.shareError"));
      return;
    }

    try {
      // Use html2canvas to capture the current card
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#0e1520',
        scale: 3,
        useCORS: true,
        logging: false
      });

      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `pipekeeper-story-${currentIndex + 1}.png`, { type: 'image/png' });

      // Try native share if available
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: currentCard?.title || t("story.appName"),
          text: t("story.shareYourStory")
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pipekeeper-story-${currentIndex + 1}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(t("story.downloadSuccess"));
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error(t("story.shareError"));
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setShowViewer(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 116, 0.2), rgba(212, 175, 116, 0.1))',
          color: '#D4A574',
          border: '1px solid rgba(212, 175, 116, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        <BookOpen className="w-4 h-4" />
        <span>{t("home.viewStory")}</span>
      </button>

      {showViewer && (
        <StoryViewer
          cards={cards}
          onClose={() => setShowViewer(false)}
          onShare={handleShare}
          user={user}
        />
      )}
    </>
  );
}