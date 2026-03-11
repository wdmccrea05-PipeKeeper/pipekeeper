import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Share2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * CollectorStory — Instagram-style swipeable story viewer
 * Generates 6-10 portrait cards from user's collection data
 */
export default function CollectorStory({ isOpen, onClose, storyCards }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const cardRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const totalCards = storyCards?.length || 0;
  const currentCard = storyCards?.[currentIndex];

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!isOpen || !totalCards) return;

    progressIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalCards - 1) {
          clearInterval(progressIntervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, currentIndex, totalCards]);

  // Touch gesture handlers for mobile swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < totalCards - 1) {
      goToNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const handleShare = async () => {
    const node = cardRef.current;
    if (!node) return;

    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#0e1520",
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");

      // Try native share API first
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `pipekeeper-story-${currentIndex + 1}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ 
              files: [file], 
              title: "My PipeKeeper Story",
              text: currentCard?.title || "Check out my collection!"
            });
            return;
          }
        } catch (shareErr) {
          if (shareErr?.name === "AbortError") return;
        }
      }

      // Fallback to download
      const link = document.createElement("a");
      link.download = `pipekeeper-story-${currentIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t("story.downloadSuccess", { defaultValue: "Story card saved!" }));
    } catch (err) {
      toast.error(t("story.shareError", { defaultValue: "Could not share story" }));
    }
  };

  if (!isOpen || !totalCards) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        background: "rgba(0,0,0,0.95)", 
        backdropFilter: "blur(12px)",
        touchAction: "pan-y pinch-zoom"
      }}
      onClick={onClose}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-10" style={{ width: "min(340px, 90vw)" }}>
        {storyCards.map((_, idx) => (
          <div
            key={idx}
            className="h-0.5 flex-1 rounded-full bg-white/20 overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-300"
              style={{
                width: idx < currentIndex ? "100%" : idx === currentIndex ? "100%" : "0%",
                opacity: idx <= currentIndex ? 1 : 0.3,
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation arrows (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hidden sm:flex"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {currentIndex < totalCards - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hidden sm:flex"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story card */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
        style={{ touchAction: "pan-y" }}
      >
        <StoryCard
          {...currentCard}
          cardRef={cardRef}
          onShare={handleShare}
          cardNumber={currentIndex + 1}
          totalCards={totalCards}
        />
      </div>

      {/* Card counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium">
        {currentIndex + 1} / {totalCards}
      </div>
    </div>
  );
}

/**
 * StoryCard — Individual portrait card with full-bleed imagery
 */
function StoryCard({ 
  title, 
  value, 
  sub, 
  accent = "#C87941", 
  icon: Icon, 
  heroImage, 
  bgImage, 
  silhouetteType,
  cardRef,
  onShare,
  cardNumber,
  totalCards,
  customContent,
}) {
  const heroRotation = silhouetteType === "pipe" ? "8deg" : "-5deg";

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden"
      style={{
        width: "min(340px, 90vw)",
        height: "min(600px, 85vh)",
        borderRadius: "24px",
        background: `linear-gradient(175deg, #0e1520 0%, #131d2a 30%, ${accent}35 70%, ${accent}55 100%)`,
        border: `1px solid ${accent}66`,
        boxShadow: `0 0 0 1px ${accent}30, 0 32px 80px -16px ${accent}70, 0 8px 32px rgba(0,0,0,0.6)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Background imagery */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(30px) brightness(0.28) saturate(0.62)",
            opacity: 0.95,
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* Hero spotlight */}
      {heroImage ? (
        <div
          className="absolute left-0 right-0 pointer-events-none overflow-hidden"
          style={{ top: "28%", bottom: "18%" }}
        >
          <img
            src={heroImage}
            alt=""
            loading="eager"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${heroRotation})`,
              height: "105%",
              maxWidth: "none",
              width: "auto",
              objectFit: "contain",
              filter: `drop-shadow(0 0 30px ${accent}85) drop-shadow(0 8px 24px rgba(0,0,0,0.65))`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(10,17,28,1) 0%, rgba(10,17,28,0.18) 18%, transparent 40%, rgba(10,17,28,0.18) 78%, rgba(10,17,28,0.85) 100%)",
            }}
          />
        </div>
      ) : (
        bgImage && (
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none overflow-hidden"
            style={{ height: "55%" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center 60%",
                filter: "blur(6px) brightness(0.38) saturate(0.80)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(10,17,28,1) 0%, rgba(10,17,28,0.55) 35%, transparent 75%)",
              }}
            />
          </div>
        )
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: bgImage
            ? `linear-gradient(175deg, rgba(14,21,32,0.90) 0%, rgba(14,21,32,0.65) 30%, rgba(14,21,32,0.32) 60%, ${accent}30 85%, ${accent}44 100%)`
            : `linear-gradient(175deg, rgba(14,21,32,0.78) 0%, rgba(19,29,42,0.58) 30%, ${accent}28 70%, ${accent}42 100%)`,
        }}
      />

      {/* Grain texture */}
      <GrainTexture accent={accent} />

      {/* Ambient glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-60px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}55 0%, transparent 65%)`,
        }}
      />

      {/* Top glow bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ff 50%, ${accent}00 100%)`,
          boxShadow: `0 0 12px ${accent}cc`,
        }}
      />

      {/* Header branding */}
      <div className="relative flex items-center justify-between px-7 pt-7 pb-0">
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: `${accent}99` }}
        >
          PipeKeeper
        </div>
        <div
          className="text-[9px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            color: `${accent}cc`,
          }}
        >
          {cardNumber} / {totalCards}
        </div>
      </div>

      {/* Main content */}
      {customContent ? (
        <div className="relative flex-1 flex items-center justify-center px-7">
          {customContent}
        </div>
      ) : (
        <div
          className="relative flex flex-col items-center px-7 text-center gap-5"
          style={{
            justifyContent: heroImage ? "flex-start" : "center",
            flex: 1,
            paddingTop: heroImage ? "1.25rem" : undefined,
          }}
        >
          {/* Icon orb */}
          {Icon && (
            <div
              className="flex items-center justify-center"
              style={{
                width: heroImage ? "64px" : "90px",
                height: heroImage ? "64px" : "90px",
                borderRadius: "20px",
                background: `linear-gradient(135deg, ${accent}60 0%, ${accent}30 100%)`,
                border: `1.5px solid ${accent}66`,
                boxShadow: `0 0 40px ${accent}60, inset 0 1px 0 ${accent}50`,
              }}
            >
              <Icon
                style={{
                  width: heroImage ? "30px" : "44px",
                  height: heroImage ? "30px" : "44px",
                  color: accent,
                  filter: `drop-shadow(0 0 12px ${accent}dd)`,
                }}
              />
            </div>
          )}

          {/* Category label */}
          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: `${accent}cc` }}
          >
            {title}
          </div>

          {/* Main stat — huge typography */}
          <div
            className="font-extrabold leading-none tracking-tighter break-words max-w-full"
            style={{
              fontSize: "clamp(2.8rem, 11vw, 4.2rem)",
              color: "#F5F1E7",
              textShadow: `0 3px 18px rgba(0,0,0,0.90), 0 0 50px ${accent}80, 0 0 80px ${accent}40`,
              WebkitTextStroke: "0.5px rgba(255,255,255,0.12)",
            }}
          >
            {value ?? "—"}
          </div>

          {/* Sub text */}
          {sub && (
            <div
              className="text-base font-semibold leading-snug"
              style={{ color: `${accent}cc` }}
            >
              {sub}
            </div>
          )}
        </div>
      )}

      {/* Bottom action bar */}
      <div
        className="relative flex items-center justify-center gap-3 px-7 pb-7 pt-4"
        style={{ borderTop: `1px solid ${accent}22` }}
      >
        <button
          onClick={onShare}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
            color: "#0e1520",
            boxShadow: `0 0 20px ${accent}60`,
            border: `1px solid ${accent}aa`,
          }}
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
}

function GrainTexture({ accent }) {
  const patternId = `story-grain-${accent.replace("#", "")}`;
  
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={patternId} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="13" r="0.48" fill={accent} fillOpacity="0.075" />
          <circle cx="23" cy="5" r="0.32" fill={accent} fillOpacity="0.055" />
          <circle cx="42" cy="19" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="58" cy="8" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="74" cy="25" r="0.44" fill={accent} fillOpacity="0.06" />
          <circle cx="92" cy="11" r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="105" cy="30" r="0.52" fill={accent} fillOpacity="0.075" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}