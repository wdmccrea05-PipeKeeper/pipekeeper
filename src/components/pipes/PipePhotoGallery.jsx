import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Full-screen photo gallery carousel for pipes
 * Supports keyboard navigation (arrows, ESC), swipe on mobile, and next/previous buttons
 */
export default function PipePhotoGallery({ photos = [], isOpen = false, onClose, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Filter out empty/invalid URLs — must be computed before hooks that depend on it
  const validPhotos = (Array.isArray(photos) ? photos : []).filter(url => url && typeof url === 'string');
  const totalPhotos = validPhotos.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1));
  };

  // MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (!isOpen || totalPhotos === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, totalPhotos]);

  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 50) handlePrev();
    else if (delta < -50) handleNext();
  };

  if (!isOpen || totalPhotos === 0) return null;

  const photo = validPhotos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
      onClick={onClose}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image container — click to close */}
      <div
        className="max-w-5xl max-h-[70vh] flex items-center justify-center rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.7))' }}
        />
      </div>

      {/* Controls — above the image */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Close Gallery"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Bottom bar: counter + navigation */}
      {totalPhotos > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
          <Button
            onClick={handlePrev}
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
            <p className="text-xs text-white/80 font-medium">
              {currentIndex + 1} / {totalPhotos}
            </p>
          </div>

          <Button
            onClick={handleNext}
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Keyboard hint */}
      {totalPhotos > 1 && (
        <div className="absolute bottom-16 text-center text-[10px] text-white/40">
          <p>← → keys or swipe to navigate</p>
        </div>
      )}
    </div>
  );
}