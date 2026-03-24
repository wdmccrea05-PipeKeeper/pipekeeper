/**
 * Story Viewer Component
 * Full-screen story slideshow with swipe/tap controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Share2 } from 'lucide-react';
import StoryCard from './StoryCard';
import SocialMediaShareButtons from '@/components/share/SocialMediaShareButtons';
import { toast } from 'sonner';

export default function StoryViewer({ cards, onClose, onShare, user }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const containerRef = useRef(null);

  const minSwipeDistance = 50;
  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    setTouchEnd(endX);
    if (!touchStart) return;

    const distance = touchStart - endX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length]);



  if (!currentCard || cards.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x > rect.width / 2) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-10 p-2 rounded-lg hover:bg-white/10 transition-all"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Share button */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
        {showSocialShare && (
          <div className="bg-black/70 rounded-lg p-3 mr-2">
            <SocialMediaShareButtons 
              url={window.location.href}
              title={currentCard?.title || "Check out my collection"}
              text={currentCard?.description || "Check out this amazing item"}
              image={currentCard?.image || ""}
              onShare={() => toast.success("Shared on social media!")}
            />
          </div>
        )}
        <button
          onClick={() => setShowSocialShare(!showSocialShare)}
          className="p-2 rounded-lg hover:bg-white/10 transition-all flex items-center gap-2 text-white text-sm"
          title="Share on social media"
          aria-label="Share story card on social media"
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Main card display */}
      <div
        ref={containerRef}
        className="w-full max-w-md aspect-[9/16] flex items-center justify-center relative"
        data-story-card
        role="region"
        aria-label={`Story card ${currentIndex + 1} of ${cards.length}`}
      >
        <StoryCard card={currentCard} />
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous card"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <div className="text-white text-sm font-semibold" role="status" aria-live="polite">
          {currentIndex + 1} / {cards.length}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Next card"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-20 text-white/40 text-xs text-center hidden sm:block">
        Use arrow keys or swipe to navigate • ESC to close
      </div>
    </div>
  );
}