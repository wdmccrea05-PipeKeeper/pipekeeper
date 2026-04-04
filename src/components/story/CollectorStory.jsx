import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { X, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PIPE_SILHOUETTE_URL } from "@/components/utils/collectionConstants";

function ArtifactTexture({ accent = "#C87941", uid = "story" }) {
  const safeId = `story-tex-${accent.replace("#", "")}-${uid}`;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={safeId} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="13" r="0.48" fill={accent} fillOpacity="0.07" />
          <circle cx="23" cy="5" r="0.32" fill={accent} fillOpacity="0.05" />
          <circle cx="42" cy="19" r="0.52" fill={accent} fillOpacity="0.065" />
          <circle cx="58" cy="8" r="0.38" fill={accent} fillOpacity="0.07" />
          <circle cx="74" cy="25" r="0.44" fill={accent} fillOpacity="0.055" />
          <circle cx="92" cy="11" r="0.34" fill={accent} fillOpacity="0.06" />
          <circle cx="105" cy="30" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="14" cy="39" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="34" cy="45" r="0.48" fill={accent} fillOpacity="0.055" />
          <circle cx="55" cy="52" r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="77" cy="41" r="0.52" fill={accent} fillOpacity="0.06" />
          <circle cx="96" cy="58" r="0.38" fill={accent} fillOpacity="0.055" />
          <circle cx="111" cy="47" r="0.30" fill={accent} fillOpacity="0.07" />
          <circle cx="7" cy="65" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="28" cy="72" r="0.38" fill={accent} fillOpacity="0.055" />
          <circle cx="49" cy="80" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="68" cy="67" r="0.34" fill={accent} fillOpacity="0.06" />
          <circle cx="88" cy="85" r="0.48" fill={accent} fillOpacity="0.055" />
          <circle cx="103" cy="74" r="0.38" fill={accent} fillOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${safeId})`} />
    </svg>
  );
}

function LeafSilhouette({ className, style }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path
        d="M50 5 C20 5, 5 30, 5 55 C5 75, 20 92, 50 95 C80 92, 95 75, 95 55 C95 30, 80 5, 50 5Z"
        fill="white"
      />
      <line x1="50" y1="95" x2="50" y2="5" stroke="white" strokeWidth="2" />
      <line x1="50" y1="40" x2="20" y2="25" stroke="white" strokeWidth="1.5" />
      <line x1="50" y1="55" x2="15" y2="50" stroke="white" strokeWidth="1.5" />
      <line x1="50" y1="70" x2="20" y2="65" stroke="white" strokeWidth="1.5" />
      <line x1="50" y1="40" x2="80" y2="25" stroke="white" strokeWidth="1.5" />
      <line x1="50" y1="55" x2="85" y2="50" stroke="white" strokeWidth="1.5" />
      <line x1="50" y1="70" x2="80" y2="65" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function getValueStyle(value) {
  const text = String(value ?? "");
  const hasSpaces = /\s/.test(text);
  const isVeryLongSingleWord = !hasSpaces && text.length >= 10;
  const isLongMultiWord = hasSpaces && text.length >= 22;

  if (isVeryLongSingleWord) {
    return {
      fontSize: "clamp(2rem, 7.5vw, 3rem)",
      lineHeight: 1.0,
      wordBreak: "normal",
      overflowWrap: "normal",
      hyphens: "none",
      textWrap: "balance",
      whiteSpace: "normal",
    };
  }

  if (isLongMultiWord) {
    return {
      fontSize: "clamp(2rem, 8vw, 3.2rem)",
      lineHeight: 1.0,
      wordBreak: "normal",
      overflowWrap: "break-word",
      hyphens: "none",
      textWrap: "balance",
      whiteSpace: "normal",
    };
  }

  return {
    fontSize: "clamp(2.4rem, 9vw, 3.4rem)",
    lineHeight: 1.0,
    wordBreak: "normal",
    overflowWrap: "normal",
    hyphens: "none",
    textWrap: "balance",
    whiteSpace: "normal",
  };
}

async function captureAndShare(node, filename) {
  const canvas = await html2canvas(node, {
    backgroundColor: "#0b0908",
    scale: 3,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/png");

  if (navigator.share && navigator.canShare) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${filename}.png`, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "PipeKeeper Story" });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }

  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

function StorySlide({ card, current, total, slideRef }) {
  const { t } = useTranslation();
  const Icon = card?.icon || Share2;
  const accent = card?.accent || "#C87941";
  const artifactImage = card?.artifactImage || null;
  const heroImage = card?.heroImage || null;
  const silhouetteType = card?.silhouetteType || "pipe";
  const value = card?.value ?? "—";
  const title = card?.title ?? "";
  const sub = card?.sub ?? "";
  const heroRotation = silhouetteType === "pipe" ? "8deg" : "-5deg";

  return (
    <div
      ref={slideRef}
      className="relative overflow-hidden"
      style={{
        width: "min(340px, 90vw)",
        height: "min(560px, 85vh)",
        borderRadius: "20px",
        background: "linear-gradient(165deg, rgba(32, 22, 15, 0.98), rgba(42, 30, 20, 0.95))",
        border: "1px solid rgba(120, 90, 65, 0.42)",
        boxShadow: "0 8px 26px rgba(0,0,0,0.72), inset 0 1px 0 rgba(180,140,100,0.12)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {artifactImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${artifactImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) brightness(0.28) saturate(0.62) sepia(0.22)",
            opacity: 0.95,
            transform: "scale(1.12)",
          }}
        />
      )}

      {heroImage ? (
        <div
          className="absolute left-0 right-0 pointer-events-none overflow-hidden"
          style={{ top: "28%", bottom: "18%" }}
        >
          <img
            src={heroImage}
            alt=""
            loading="lazy"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${heroRotation})`,
              height: "105%",
              maxWidth: "none",
              width: "auto",
              objectFit: "contain",
              filter: `drop-shadow(0 0 18px ${accent}55) drop-shadow(0 8px 24px rgba(0,0,0,0.7))`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(28,18,10,1) 0%, rgba(28,18,10,0.2) 18%, transparent 40%, rgba(28,18,10,0.2) 78%, rgba(20,12,8,0.90) 100%)",
            }}
          />
        </div>
      ) : (
        <>
          {silhouetteType === "pipe" && (
            <div
              className="absolute pointer-events-none"
              style={{ bottom: "72px", right: "-16px", width: "190px", height: "190px", opacity: 0.075 }}
            >
              <img
                src={PIPE_SILHOUETTE_URL}
                alt=""
                className="w-full h-full object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          )}
          {silhouetteType === "leaf" && (
            <LeafSilhouette
              className="absolute pointer-events-none"
              style={{ bottom: "75px", right: "-8px", width: "170px", height: "170px", opacity: 0.08 }}
            />
          )}
        </>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(165deg, rgba(28,18,10,0.92) 0%, rgba(28,18,10,0.70) 32%, rgba(28,18,10,0.35) 60%, transparent 92%)",
        }}
      />

      <ArtifactTexture accent={accent} uid={`slide-${current}`} />

      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}aa 50%, transparent 100%)`,
          boxShadow: `0 0 7px ${accent}55`,
        }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-60px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
        }}
      />

      <div className="relative flex items-center justify-between px-7 pt-7">
        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold whitespace-nowrap"
          style={{ color: "rgba(180,140,75,0.72)" }}
        >
          PipeKeeper
        </div>

        <div
          className="text-[10px] font-semibold px-3 py-1 rounded-full"
          style={{
            background: "rgba(100,70,45,0.16)",
            border: "1px solid rgba(120,90,65,0.35)",
            color: "rgba(180,140,75,0.92)",
          }}
        >
          {current + 1} / {total}
        </div>
      </div>

      <div className="relative flex flex-col items-center px-7 text-center gap-5 flex-1 pt-6">
        <div
          className="flex items-center justify-center"
          style={{
            width: "76px",
            height: "76px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(100,70,45,0.5) 0%, rgba(80,55,35,0.6) 100%)",
            border: "1.5px solid rgba(120,90,65,0.5)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.2)",
          }}
        >
          <Icon
            style={{
              width: "34px",
              height: "34px",
              color: accent,
              filter: `drop-shadow(0 0 8px ${accent}88)`,
            }}
          />
        </div>

        <div
          className="text-[11px] uppercase tracking-[0.22em] font-bold text-center px-2"
          style={{ color: "rgba(180,140,75,0.86)", fontFamily: "'Georgia', serif", overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          {title}
        </div>

        <div
          className="font-extrabold tracking-tighter px-4 max-w-full flex items-center justify-center"
          style={{
            color: "#F5F1E7",
            textShadow: "0 3px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)",
            WebkitTextStroke: "0.35px rgba(255,255,255,0.08)",
            fontFamily: "'Georgia', serif",
            maxWidth: "100%",
            minHeight: "90px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...getValueStyle(value),
          }}
        >
          {value}
        </div>

        {sub ? (
          <div
            className="text-base font-semibold leading-snug px-4 max-w-[92%]"
            style={{
              color: "rgba(180,140,75,0.82)",
              wordBreak: "normal",
              overflowWrap: "break-word",
              hyphens: "none",
              textWrap: "balance",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>

      <div
        className="relative flex items-center justify-center px-7 pb-7 pt-5"
        style={{ borderTop: "1px solid rgba(120,90,65,0.22)" }}
      >
        <button
          type="button"
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)",
            color: "rgba(28,18,10,1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            border: "1px solid rgba(140,105,60,0.8)",
          }}
          onClick={() => {
            const evt = new CustomEvent("pipekeeper-story-share");
            window.dispatchEvent(evt);
          }}
        >
          <Share2 className="w-4 h-4" />
          {t("common.share", "Share")}
        </button>
      </div>
    </div>
  );
}

export default function CollectorStory({ isOpen, onClose, storyCards = [] }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const slideRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, storyCards.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }

    async function onShare() {
      if (!slideRef.current) return;
      try {
        await captureAndShare(slideRef.current, `pipekeeper-story-${index + 1}`);
      } catch (err) {
        if (err?.name !== "AbortError") {
          toast.error(t("insights.shareError", "Failed to share card"));
        }
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pipekeeper-story-share", onShare);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pipekeeper-story-share", onShare);
    };
  }, [isOpen, index, onClose, storyCards.length, t]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const distance = touchStartX.current - endX;
    touchStartX.current = null;
    if (distance > 50) setIndex((i) => Math.min(i + 1, storyCards.length - 1));
    else if (distance < -50) setIndex((i) => Math.max(i - 1, 0));
  };

  if (!isOpen || !storyCards.length) return null;

  const current = storyCards[Math.max(0, Math.min(index, storyCards.length - 1))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div
          className="flex items-center gap-3"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30 hidden sm:flex"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label={t("common.previous", "Previous")}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <StorySlide card={current} current={index} total={storyCards.length} slideRef={slideRef} />

          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(i + 1, storyCards.length - 1))}
            disabled={index === storyCards.length - 1}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30 hidden sm:flex"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label={t("common.next", "Next")}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Mobile nav buttons below card */}
        <div className="flex items-center gap-4 sm:hidden">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/60 text-sm">{index + 1} / {storyCards.length}</span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(i + 1, storyCards.length - 1))}
            disabled={index === storyCards.length - 1}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}