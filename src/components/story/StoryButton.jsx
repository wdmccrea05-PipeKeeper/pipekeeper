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

export default function StoryButton() {
  const { user } = useCurrentUser();
  const { data: cards = [] } = useCollectorStory(user);
  const [showViewer, setShowViewer] = useState(false);

  if (!cards || cards.length === 0) {
    return null; // Don't show button if no story to display
  }

  const handleShare = async (card) => {
    try {
      // Try native share if available
      if (navigator.share) {
        await navigator.share({
          title: 'My PipeKeeper Story',
          text: `Check out my collector story on PipeKeeper!`,
          url: window.location.href
        });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error('Could not share');
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
        <span>View Story</span>
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