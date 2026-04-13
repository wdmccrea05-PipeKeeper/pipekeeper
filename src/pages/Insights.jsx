import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency } from "@/components/utils/localeFormatters";
import {
  calculateCellaredOzFromBlend,
  calculateTobaccoCollectionValue,
} from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
import PipeKeeperModuleNav from "@/components/modules/PipeKeeperModuleNav";
import {
  BarChart3,
  Flame,
  Leaf,
  Star,
  Trophy,
  TrendingUp,
  Calendar,
  Award,
  Share2,
  Zap,
  Clock,
  X,
  Sparkles,
} from "lucide-react";
import { useCurrency } from "@/lib/currency/useCurrency";
import {
  differenceInCalendarDays,
  subDays,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { getBowlsUsed } from "@/components/utils/schemaCompatibility";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { PIPE_SILHOUETTE_URL } from "@/components/utils/collectionConstants";
import { StatusCard, CATEGORY_COLORS } from "@/components/ui/HeroCard";
import CollectorStory from "@/components/story/CollectorStory";
import StoryTrigger from "@/components/story/StoryTrigger";
import { generateStoryCards } from "@/components/story/generateStoryCards";

const DEFAULT_INSIGHTS_TAB = "log";

function getTabFromUrl() {
  try {
    return (
      new URLSearchParams(window.location.search).get("tab") ||
      DEFAULT_INSIGHTS_TAB
    );
  } catch {
    return DEFAULT_INSIGHTS_TAB;
  }
}

// ── Image-selection helpers ───────────────────────────────────────────────────
function getPipeImage(pipe) {
  if (!pipe) return null;
  return pipe.photos?.[0] || pipe.primary_photo || pipe.image || null;
}

function getBlendImage(blend) {
  if (!blend) return null;
  return blend.logo || blend.photo || blend.tin_image || blend.brand_logo || null;
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function gatherCollectionImages(pipes, blends) {
  const pipeImgs = (pipes || []).flatMap((p) =>
    [p?.photos?.[0], p?.primary_photo, p?.image].filter(Boolean)
  );
  const blendImgs = (blends || []).flatMap((b) =>
    [b?.logo, b?.photo, b?.tin_image, b?.brand_logo].filter(Boolean)
  );
  return { pipeImgs, blendImgs, allImgs: [...pipeImgs, ...blendImgs] };
}

// ── Real texture overlays (grain, wood grain, paper) ─────────────────────────
function getTextureType(silhouetteType) {
  if (silhouetteType === "pipe") return "woodgrain";
  if (silhouetteType === "leaf") return "paper";
  return "grain";
}

function ArtifactTexture({ type = "grain", accent = "#4A7C9C", uid = "0" }) {
  const safeId = `atex-${type}-${accent.replace("#", "")}-${uid}`;

  if (type === "woodgrain") {
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={safeId}
            x="0"
            y="0"
            width="200"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0,4 C35,3 65,5 100,4 S165,3 200,4"
              stroke={accent}
              strokeWidth="0.55"
              fill="none"
              strokeOpacity="0.09"
            />
            <path
              d="M0,10 C45,9 85,11 130,10 S175,9 200,10"
              stroke={accent}
              strokeWidth="0.38"
              fill="none"
              strokeOpacity="0.06"
            />
            <path
              d="M0,16 C30,15 70,17 110,16 S170,15 200,16"
              stroke={accent}
              strokeWidth="0.50"
              fill="none"
              strokeOpacity="0.08"
            />
            <path
              d="M0,22 C55,21 95,23 145,22 S185,21 200,22"
              stroke={accent}
              strokeWidth="0.32"
              fill="none"
              strokeOpacity="0.05"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${safeId})`} />
      </svg>
    );
  }

  if (type === "paper") {
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={safeId}
            x="0"
            y="0"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="60"
              stroke={accent}
              strokeWidth="0.28"
              strokeOpacity="0.055"
            />
            <line
              x1="10"
              y1="0"
              x2="10"
              y2="60"
              stroke={accent}
              strokeWidth="0.22"
              strokeOpacity="0.04"
            />
            <line
              x1="20"
              y1="0"
              x2="20"
              y2="60"
              stroke={accent}
              strokeWidth="0.28"
              strokeOpacity="0.05"
            />
            <line
              x1="30"
              y1="0"
              x2="30"
              y2="60"
              stroke={accent}
              strokeWidth="0.22"
              strokeOpacity="0.04"
            />
            <line
              x1="40"
              y1="0"
              x2="40"
              y2="60"
              stroke={accent}
              strokeWidth="0.28"
              strokeOpacity="0.055"
            />
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="60"
              stroke={accent}
              strokeWidth="0.22"
              strokeOpacity="0.04"
            />
            <line
              x1="0"
              y1="0"
              x2="60"
              y2="0"
              stroke={accent}
              strokeWidth="0.22"
              strokeOpacity="0.04"
            />
            <line
              x1="0"
              y1="15"
              x2="60"
              y2="15"
              stroke={accent}
              strokeWidth="0.18"
              strokeOpacity="0.032"
            />
            <line
              x1="0"
              y1="30"
              x2="60"
              y2="30"
              stroke={accent}
              strokeWidth="0.22"
              strokeOpacity="0.04"
            />
            <line
              x1="0"
              y1="45"
              x2="60"
              y2="45"
              stroke={accent}
              strokeWidth="0.18"
              strokeOpacity="0.032"
            />
            <circle cx="7" cy="19" r="0.42" fill={accent} fillOpacity="0.065" />
            <circle cx="34" cy="7" r="0.32" fill={accent} fillOpacity="0.05" />
            <circle cx="53" cy="43" r="0.42" fill={accent} fillOpacity="0.065" />
            <circle cx="19" cy="52" r="0.32" fill={accent} fillOpacity="0.05" />
            <circle cx="45" cy="28" r="0.48" fill={accent} fillOpacity="0.055" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${safeId})`} />
      </svg>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={safeId}
          x="0"
          y="0"
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="8" cy="13" r="0.48" fill={accent} fillOpacity="0.075" />
          <circle cx="23" cy="5" r="0.32" fill={accent} fillOpacity="0.055" />
          <circle cx="42" cy="19" r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="58" cy="8" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="74" cy="25" r="0.44" fill={accent} fillOpacity="0.06" />
          <circle cx="92" cy="11" r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="105" cy="30" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="14" cy="39" r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="34" cy="45" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="55" cy="52" r="0.34" fill={accent} fillOpacity="0.075" />
          <circle cx="77" cy="41" r="0.52" fill={accent} fillOpacity="0.065" />
          <circle cx="96" cy="58" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="111" cy="47" r="0.30" fill={accent} fillOpacity="0.075" />
          <circle cx="7" cy="65" r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="28" cy="72" r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="49" cy="80" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="68" cy="67" r="0.34" fill={accent} fillOpacity="0.065" />
          <circle cx="88" cy="85" r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="103" cy="74" r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="17" cy="95" r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="39" cy="103" r="0.34" fill={accent} fillOpacity="0.06" />
          <circle cx="62" cy="110" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="85" cy="98" r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="108" cy="115" r="0.48" fill={accent} fillOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${safeId})`} />
    </svg>
  );
}

// ── Reusable leaf silhouette watermark ────────────────────────────────────────
function LeafSilhouette({ className, style }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
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

// ── Highlight card ────────────────────────────────────────────────────────────
function HighlightCard({
  title,
  value,
  sub,
  accent = "#C87941",
  icon: Icon,
  onShare,
  onStory,
  cardRef,
  patternIndex = 0,
  artifactImage,
  heroImage,
  silhouetteType,
}) {
  const { t } = useTranslation();
  const textureType = getTextureType(silhouetteType);
  const heroRotation = silhouetteType === "pipe" ? "12deg" : "-8deg";

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[220px] cursor-default group hover:-translate-y-1 transition-transform duration-300"
      style={{
        background:
          "linear-gradient(155deg, rgba(38, 26, 18, 0.96), rgba(32, 22, 15, 0.99))",
        border: "1px solid rgba(120, 90, 65, 0.42)",
        boxShadow:
          "0 5px 20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(180,140,100,0.14), inset 0 -3px 4px rgba(0,0,0,0.3)",
      }}
    >
      {artifactImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${artifactImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: heroImage
              ? "blur(22px) brightness(0.28) saturate(0.65) sepia(0.2)"
              : "blur(20px) brightness(0.25) saturate(0.55) sepia(0.2)",
            opacity: 0.95,
            transform: "scale(1.12)",
          }}
        />
      )}

      {heroImage ? (
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
          style={{ width: "55%" }}
        >
          <img
            src={heroImage}
            alt=""
            loading="lazy"
            className="absolute"
            style={{
              right: "-8%",
              top: "50%",
              transform: `translateY(-50%) rotate(${heroRotation})`,
              height: "115%",
              maxWidth: "none",
              width: "auto",
              objectFit: "contain",
              filter: `drop-shadow(0 0 18px ${accent}70) drop-shadow(0 6px 14px rgba(0,0,0,0.7))`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, rgba(28,18,10,1) 0%, rgba(28,18,10,0.42) 38%, transparent 72%)",
            }}
          />
          {silhouetteType === "pipe" && (
            <div
              className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${accent}50 0%, transparent 70%)`,
                transform: "translate(20%, 20%)",
              }}
            />
          )}
          {silhouetteType === "leaf" && (
            <div
              className="absolute"
              style={{
                right: "8%",
                top: "50%",
                transform: "translateY(-50%)",
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                border: `1px solid ${accent}28`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      ) : (
        <>
          {silhouetteType === "pipe" && (
            <div
              className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none"
              style={{ opacity: 0.07 }}
            >
              <img
                src={PIPE_SILHOUETTE_URL}
                alt=""
                className="w-full h-full object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
                loading="lazy"
              />
            </div>
          )}
          {silhouetteType === "leaf" && (
            <LeafSilhouette
              className="absolute bottom-1 right-1 w-36 h-36 pointer-events-none"
              style={{ opacity: 0.07 }}
            />
          )}
        </>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: artifactImage || heroImage
            ? "linear-gradient(to right, rgba(28,18,10,0.92) 0%, rgba(28,18,10,0.72) 45%, rgba(28,18,10,0.28) 75%, transparent 100%)"
            : "linear-gradient(155deg, rgba(32,22,15,0.72) 0%, rgba(28,18,10,0.52) 45%, rgba(100,70,45,0.15) 100%)",
        }}
      />

      {(artifactImage || heroImage) && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "58%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)",
          }}
        />
      )}

      <ArtifactTexture
        type={textureType}
        accent={accent}
        uid={String(patternIndex)}
      />

      <div
        className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
          transform: "translate(30%, 30%)",
        }}
      />
      <div
        className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          transform: "translate(-30%, -30%)",
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ee 35%, ${accent}ff 50%, ${accent}ee 65%, ${accent}00 100%)`,
          boxShadow: `0 0 8px ${accent}cc`,
        }}
      />

      <div className="relative p-6 pb-4 flex flex-col gap-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl flex items-center justify-center shrink-0"
            style={{
              width: "3.5rem",
              height: "3.5rem",
              background:
                "linear-gradient(135deg, rgba(100, 70, 45, 0.5) 0%, rgba(80, 55, 35, 0.6) 100%)",
              border: "1px solid rgba(120, 90, 65, 0.45)",
              boxShadow:
                "0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.22)",
            }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: accent, filter: `drop-shadow(0 0 7px ${accent}dd)` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {onStory && (
              <button
                onClick={onStory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 opacity-0 group-hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}30`,
                  border: `1px solid ${accent}50`,
                  color: accent,
                }}
                title={t("insights.viewStoryCard")}
              >
                <Sparkles className="w-3 h-3" />
                {t("insights.story")}
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 opacity-40 hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}25`,
                  border: `1px solid ${accent}45`,
                }}
                title={t("common.share")}
              >
                <Share2 className="w-3.5 h-3.5" style={{ color: accent }} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold leading-tight"
            style={{ 
              color: "rgba(180,140,75,0.9)",
              whiteSpace: "normal",
              wordWrap: "break-word",
              hyphens: "none"
            }}
          >
            {title}
          </div>
          <div
            className="text-[2.25rem] font-extrabold leading-tight tracking-tight"
            style={{
              color: "#F5F1E7",
              textShadow:
                "0 2px 10px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)",
              WebkitTextStroke: "0.4px rgba(255,255,255,0.12)",
              fontFamily: "'Georgia', serif",
              whiteSpace: "normal",
              wordWrap: "break-word",
              hyphens: "none"
            }}
          >
            {value ?? "—"}
          </div>
          {sub && (
            <div
              className="text-sm leading-snug pt-1 font-semibold"
              style={{
                color: "rgba(180,140,75,0.85)",
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      <div
        className="relative px-5 py-2.5 flex items-center justify-between"
        style={{ borderTop: `1px solid ${accent}20` }}
      >
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bold select-none whitespace-nowrap"
          style={{ color: "rgba(180,140,75,0.6)" }}
        >
          PipeKeeper
        </span>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide font-semibold rounded-md px-2 py-1 transition-all duration-200 opacity-50 hover:opacity-100 active:opacity-100"
            style={{
              color: "rgba(180,140,75,0.9)",
              border: "1px solid rgba(120,90,65,0.3)",
              background: "rgba(100,70,45,0.15)",
            }}
          >
            <Share2 className="w-2.5 h-2.5" />
            {t("common.share")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Full-screen Story / Share card modal ──────────────────────────────────────
function StoryCardModal({
  title,
  value,
  sub,
  accent,
  icon: Icon,
  onClose,
  onExport,
  storyRef,
  artifactImage,
  heroImage,
  silhouetteType,
}) {
  const { t } = useTranslation();
  const storyTextureType = getTextureType(silhouetteType);
  const heroRotation = silhouetteType === "pipe" ? "8deg" : "-5deg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <X className="w-5 h-5" />
      </button>

      <div
        ref={storyRef}
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden"
        style={{
          width: "min(340px, 90vw)",
          height: "min(560px, 85vh)",
          borderRadius: "16px",
          background:
            "linear-gradient(165deg, rgba(32, 22, 15, 0.98), rgba(42, 30, 20, 0.95))",
          border: "1px solid rgba(120, 90, 65, 0.4)",
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(180,140,100,0.1)",
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
              filter: "blur(30px) brightness(0.3) saturate(0.65) sepia(0.25)",
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
                filter:
                  "drop-shadow(0 0 20px rgba(180,140,75,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(28,18,10,1) 0%, rgba(28,18,10,0.2) 18%, transparent 40%, rgba(28,18,10,0.2) 78%, rgba(20,12,8,0.90) 100%)",
              }}
            />
            {silhouetteType === "pipe" && (
              <div
                className="absolute bottom-0 left-1/2 w-40 h-16 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse, ${accent}50 0%, transparent 70%)`,
                  transform: "translateX(-50%) translateY(40%)",
                }}
              />
            )}
          </div>
        ) : (
          artifactImage && (
            <div
              className="absolute left-0 right-0 bottom-0 pointer-events-none overflow-hidden"
              style={{ height: "55%" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${artifactImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center 60%",
                  filter: "blur(6px) brightness(0.4) saturate(0.75) sepia(0.2)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(28,18,10,1) 0%, rgba(28,18,10,0.55) 35%, transparent 75%)",
                }}
              />
            </div>
          )
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: artifactImage
              ? "linear-gradient(165deg, rgba(28,18,10,0.92) 0%, rgba(28,18,10,0.70) 30%, rgba(28,18,10,0.35) 60%, transparent 90%)"
              : "linear-gradient(165deg, rgba(32,22,15,0.85) 0%, rgba(35,24,16,0.65) 30%, rgba(40,28,18,0.3) 70%, transparent 100%)",
          }}
        />

        {!heroImage && silhouetteType === "pipe" && (
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: "70px",
              right: "-20px",
              width: "200px",
              height: "200px",
              opacity: 0.08,
            }}
          >
            <img
              src={PIPE_SILHOUETTE_URL}
              alt=""
              className="w-full h-full object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              loading="lazy"
            />
          </div>
        )}
        {!heroImage && silhouetteType === "leaf" && (
          <LeafSilhouette
            className="absolute pointer-events-none"
            style={{
              bottom: "70px",
              right: "-10px",
              width: "180px",
              height: "180px",
              opacity: 0.08,
            }}
          />
        )}

        <ArtifactTexture type={storyTextureType} accent={accent} uid="story" />

        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(180,140,75,0.2) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-40px",
            left: "-40px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(180,140,75,0.15) 0%, transparent 65%)",
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(180,140,75,0.6) 50%, transparent 100%)",
            boxShadow: "0 0 6px rgba(180,140,75,0.4)",
          }}
        />

        <div className="relative flex items-center justify-between px-7 pt-7 pb-0">
          <div
            className="text-[10px] uppercase tracking-[0.22em] font-bold whitespace-nowrap"
            style={{ color: "rgba(180,140,75,0.7)" }}
          >
            PipeKeeper
          </div>
          <div
            className="text-[9px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(100,70,45,0.2)",
              border: "1px solid rgba(120,90,65,0.35)",
              color: "rgba(180,140,75,0.9)",
            }}
          >
            {t("insights.highlight")}
          </div>
        </div>

        <div
          className="relative flex flex-col items-center px-7 text-center gap-5"
          style={{
            justifyContent: heroImage ? "flex-start" : "center",
            flex: 1,
            paddingTop: heroImage ? "1.25rem" : undefined,
            paddingBottom: heroImage ? "0" : undefined,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: heroImage ? "64px" : "90px",
              height: heroImage ? "64px" : "90px",
              borderRadius: "20px",
              background:
                "linear-gradient(135deg, rgba(100,70,45,0.5) 0%, rgba(80,55,35,0.6) 100%)",
              border: "1.5px solid rgba(120,90,65,0.5)",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.2)",
            }}
          >
            <Icon
              style={{
                width: heroImage ? "30px" : "44px",
                height: heroImage ? "30px" : "44px",
                color: accent,
                filter: "drop-shadow(0 0 8px rgba(180,140,75,0.7))",
              }}
            />
          </div>

          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold whitespace-nowrap"
            style={{
              color: "rgba(180,140,75,0.85)",
              fontFamily: "'Georgia', serif",
            }}
          >
            {title}
          </div>

          <div
            className="font-extrabold leading-none tracking-tighter px-4"
            style={{
              fontSize: "clamp(2.8rem, 11vw, 4.2rem)",
              color: "#F5F1E7",
              textShadow:
                "0 3px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)",
              WebkitTextStroke: "0.4px rgba(255,255,255,0.08)",
              fontFamily: "'Georgia', serif",
              maxWidth: "100%",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {value ?? "—"}
          </div>

          {sub && (
            <div
              className="text-sm font-semibold leading-snug px-4"
              style={{
                color: "rgba(180,140,75,0.8)",
                maxWidth: "90%",
              }}
            >
              {sub}
            </div>
          )}
        </div>

        <div
          className="relative flex items-center justify-center gap-3 px-7 pb-7 pt-4"
          style={{ borderTop: "1px solid rgba(120,90,65,0.25)" }}
        >
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)",
              color: "rgba(28,18,10,1)",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
              border: "1px solid rgba(140,105,60,0.8)",
            }}
          >
            <Share2 className="w-4 h-4" />
            {t("common.shareExport")}
          </button>
        </div>
      </div>
    </div>
  );
}

function computeLongestStreak(logs) {
  if (!logs || logs.length === 0) return 0;

  const days = [
    ...new Set(
      logs
        .map((l) => {
          try {
            return l.date ? l.date.slice(0, 10) : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    ),
  ].sort();

  if (days.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = parseISO(days[i - 1]);
    const curr = parseISO(days[i]);
    const diff = differenceInCalendarDays(curr, prev);

    if (diff === 1) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export default function Insights() {
  const { t } = useTranslation();
  const { user, hasPaid } = useCurrentUser();
  const navigate = useNavigate();
  // Subscribe to currency context so the component re-renders when the user changes currency
  useCurrency();
  const initialTab = getTabFromUrl();

  const highlightRefs = useRef({});
  const storyRef = useRef(null);
  const [activeStory, setActiveStory] = useState(null);
  const [showFullStory, setShowFullStory] = useState(false);

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({
        created_by: user?.email,
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ["cellar-logs-all", user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: () =>
      base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date", 1000),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const totalPipeValue = useMemo(
    () => pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0),
    [pipes]
  );

  const totalTobaccoValue = useMemo(
    () => calculateTobaccoCollectionValue(blends, cellarLogs),
    [blends, cellarLogs]
  );

  const totalCellaredOz = useMemo(
    () => blends.reduce((sum, b) => sum + calculateCellaredOzFromBlend(b), 0),
    [blends]
  );

  const totalCollectionValue = totalPipeValue + totalTobaccoValue;

  const now = new Date();
  const oneWeekAgo = subDays(now, 7);

  const sessionsThisWeek = useMemo(
    () =>
      smokingLogs.filter((l) => {
        try {
          if (!l?.date) return false;
          const d = parseISO(l.date.slice(0, 10));
          return isWithinInterval(d, { start: oneWeekAgo, end: now });
        } catch {
          return false;
        }
      }).length,
    [smokingLogs, oneWeekAgo, now]
  );

  const pipeUsage = useMemo(() => {
    const map = {};
    smokingLogs.forEach((l) => {
      if (l?.pipe_id) {
        map[l.pipe_id] = (map[l.pipe_id] || 0) + getBowlsUsed(l);
      }
    });
    return map;
  }, [smokingLogs]);

  const blendUsage = useMemo(() => {
    const map = {};
    smokingLogs.forEach((l) => {
      if (l?.blend_id) {
        map[l.blend_id] = (map[l.blend_id] || 0) + getBowlsUsed(l);
      }
    });
    return map;
  }, [smokingLogs]);

  const mostUsedPipe = useMemo(() => {
    if (!Object.keys(pipeUsage).length) return null;
    const topId = Object.entries(pipeUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
    const pipe = pipes.find((p) => p.id === topId);
    return pipe ? { pipe, count: pipeUsage[topId] } : null;
  }, [pipeUsage, pipes]);

  const mostUsedBlend = useMemo(() => {
    if (!Object.keys(blendUsage).length) return null;
    const topId = Object.entries(blendUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
    const blend = blends.find((b) => b.id === topId);
    return blend ? { blend, count: blendUsage[topId] } : null;
  }, [blendUsage, blends]);

  const mostValuablePipe = useMemo(() => {
    if (!pipes.length) return null;
    const top = [...pipes].sort(
      (a, b) => (Number(b?.estimated_value) || 0) - (Number(a?.estimated_value) || 0)
    )[0];
    return top?.estimated_value ? top : null;
  }, [pipes]);

  const longestStreak = useMemo(
    () => computeLongestStreak(smokingLogs),
    [smokingLogs]
  );

  const hasData = pipes.length > 0 || blends.length > 0 || smokingLogs.length > 0;

  const fullStoryCards = useMemo(() => {
    if (!pipes.length && !blends.length) return [];
    return generateStoryCards(
      pipes,
      blends,
      smokingLogs,
      totalCollectionValue,
      formatCurrency,
      t
    );
  }, [pipes, blends, smokingLogs, totalCollectionValue, t]);

  const analyticsImages = useMemo(() => {
    const { pipeImgs, blendImgs, allImgs } = gatherCollectionImages(pipes, blends);
    const safePickPipe = pickRandom(pipeImgs.length > 0 ? pipeImgs : allImgs);
    const safePickBlend = pickRandom(blendImgs.length > 0 ? blendImgs : allImgs);

    return {
      streak: pickRandom(pipeImgs),
      sessions: pickRandom(allImgs),
      collectionValue: pickRandom(allImgs),
      snapshotSessions: safePickPipe,
      snapshotPipes: pickRandom(pipeImgs.length > 0 ? pipeImgs : allImgs),
      snapshotBlends: safePickBlend,
      snapshotValue: pickRandom(allImgs),
      snapshotStreak: safePickPipe,
      snapshotAvg: pickRandom(allImgs),
    };
  }, [pipes.length, blends.length]);

  const captureAndShare = async (node, filename) => {
    const canvas = await html2canvas(node, {
      backgroundColor: "#0e1520",
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
          await navigator.share({
            files: [file],
            title: "My PipeKeeper Highlight",
          });
          return;
        }
      } catch (shareErr) {
        if (shareErr?.name === "AbortError") return;
      }
    }

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareCard = async (key) => {
    const node = highlightRefs.current[key];
    if (!node) return;

    try {
      await captureAndShare(node, `pipekeeper-highlight-${key}`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("insights.shareError"));
      }
    }
  };

  const handleExportStory = async () => {
    const node = storyRef.current;
    if (!node) return;

    try {
      await captureAndShare(node, "pipekeeper-story-card");
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(t("insights.shareError"));
      }
    }
  };

  return (
    <div className="space-y-6">
      <PipeKeeperModuleNav currentPageName="Insights" />
      
      <div className="space-y-10">
      {activeStory && (
        <StoryCardModal
          {...activeStory}
          storyRef={storyRef}
          onClose={() => setActiveStory(null)}
          onExport={handleExportStory}
        />
      )}

      <CollectorStory
        isOpen={showFullStory}
        onClose={() => setShowFullStory(false)}
        storyCards={fullStoryCards}
      />

      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(180, 140, 75, 0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3 py-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))",
                  border: "1px solid rgba(120, 90, 65, 0.45)",
                  boxShadow:
                    "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)",
                }}
              >
                <BarChart3
                  className="w-5 h-5"
                  style={{
                    color: "rgba(180, 140, 75, 1)",
                    filter: "drop-shadow(0 0 4px rgba(180,140,75,0.7))",
                  }}
                />
              </div>

              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight break-words"
                style={{
                  color: "#F5F1E7",
                  fontFamily: "'Georgia', serif",
                  textShadow: "0 2px 6px rgba(0,0,0,0.7)",
                  wordBreak: "break-word",
                  hyphens: "none"
                }}
              >
                {t("insights.title")}
              </h1>

              {hasPaid && (
                <Badge
                  className="border-0 text-xs"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                    color: "#1a120a",
                  }}
                >
                  {t("subscription.proBadge")}
                </Badge>
              )}
            </div>

            <p
              className="text-base sm:pl-14"
              style={{ color: "rgba(224, 216, 200, 0.75)" }}
            >
              {t("insights.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatusCard
          icon={Flame}
          label={t("insights.snapshotSessions")}
          value={smokingLogs.length}
          accent={CATEGORY_COLORS.pipe}
          sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek")}`}
          bgImage={analyticsImages.snapshotSessions}
        />
        <StatusCard
          icon={isAppleBuild ? Leaf : BarChart3}
          label={t("home.pipesInCollection")}
          value={pipes.length}
          accent={CATEGORY_COLORS.general}
          bgImage={analyticsImages.snapshotPipes}
        />
        <StatusCard
          icon={Leaf}
          label={t("home.tobaccoBlends")}
          value={blends.length}
          accent={CATEGORY_COLORS.tobacco}
          sub={`${totalCellaredOz.toFixed(1)} ${t("units.oz")} ${t("home.cellared")}`}
          bgImage={analyticsImages.snapshotBlends}
        />
        <StatusCard
          icon={TrendingUp}
          label={t("home.totalValue")}
          value={formatCurrency(Math.round(totalCollectionValue))}
          accent={CATEGORY_COLORS.value}
          bgImage={analyticsImages.snapshotValue}
        />
        <StatusCard
          icon={Clock}
          label={t("insights.snapshotStreak")}
          value={`${longestStreak}d`}
          accent={CATEGORY_COLORS.streak}
          sub={t("insights.snapshotConsecutiveDays")}
          bgImage={analyticsImages.streak}
          useBlurredBg={true}
        />
        <StatusCard
          icon={Calendar}
          label={t("insights.snapshotAvgWeek")}
          value={
            smokingLogs.length > 0
              ? (
                  smokingLogs.length /
                  Math.max(
                    1,
                    Math.ceil(
                      differenceInCalendarDays(
                        now,
                        parseISO(
                          smokingLogs[
                            smokingLogs.length - 1
                          ]?.date?.slice(0, 10) || now.toISOString().slice(0, 10)
                        )
                      ) / 7
                    )
                  )
                ).toFixed(1)
              : "—"
          }
          accent={CATEGORY_COLORS.activity}
          sub={t("insights.snapshotSessionsPerWeek")}
          bgImage={analyticsImages.snapshotAvg}
        />
      </div>

      {hasData && (
        <div className="space-y-7">
          <div className="relative">
            <div
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(180, 140, 75, 0.25) 40%, rgba(180, 140, 75, 0.25) 60%, transparent 100%)",
              }}
            />
            <div className="relative flex items-start gap-3 py-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))",
                  border: "1px solid rgba(120, 90, 65, 0.45)",
                  boxShadow:
                    "0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)",
                }}
              >
                <Trophy
                  className="w-5 h-5"
                  style={{
                    color: "rgba(180, 140, 75, 1)",
                    filter: "drop-shadow(0 0 5px rgba(180,140,75,0.75))",
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2
                  className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{
                    color: "#F5F1E7",
                    fontFamily: "'Georgia', serif",
                    textShadow: "0 2px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  {t("insights.topHighlights", "Top Highlights")}
                </h2>
                <p
                  className="text-xs uppercase tracking-[0.12em] font-semibold mt-1"
                  style={{ color: "rgba(180, 140, 75, 0.75)" }}
                >
                  {t("insights.topHighlightsSub", "Your collection's best moments")}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                {fullStoryCards.length > 0 && (
                  <StoryTrigger
                    onClick={() => setShowFullStory(true)}
                    variant="secondary"
                    size="small"
                  />
                )}
                <button
                  onClick={() => navigate(createPageUrl("CollectionInsightsShare"))}
                  className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(180,140,75,1) 0%, rgba(160,120,65,1) 100%)",
                    color: "rgba(28,18,10,1)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                    border: "1px solid rgba(140,105,60,0.8)",
                  }}
                  title="Generate shareable collection insights"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("insights.shareInsights", "Share Insights")}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mostUsedPipe &&
              (() => {
                const img = getPipeImage(mostUsedPipe.pipe);
                return (
                  <HighlightCard
                    title={t("insights.highlightMostSmoked")}
                    value={mostUsedPipe.pipe.name}
                    sub={`${mostUsedPipe.count} ${t("insights.highlightBowls")}`}
                    accent="#C87941"
                    icon={Star}
                    patternIndex={0}
                    artifactImage={img}
                    heroImage={img}
                    silhouetteType="pipe"
                    cardRef={(el) => {
                      highlightRefs.current.mostPipe = el;
                    }}
                    onShare={() => handleShareCard("mostPipe")}
                    onStory={() =>
                      setActiveStory({
                        title: t("insights.highlightMostSmoked"),
                        value: mostUsedPipe.pipe.name,
                        sub: `${mostUsedPipe.count} ${t(
                          "insights.highlightBowls"
                        )}`,
                        accent: "#C87941",
                        icon: Star,
                        artifactImage: img,
                        heroImage: img,
                        silhouetteType: "pipe",
                      })
                    }
                  />
                );
              })()}

            {mostUsedBlend &&
              (() => {
                const img = getBlendImage(mostUsedBlend.blend);
                return (
                  <HighlightCard
                    title={t("insights.highlightFavoriteBlend")}
                    value={mostUsedBlend.blend.name}
                    sub={`${mostUsedBlend.count} ${t("insights.highlightBowls")}`}
                    accent="#4A9C6A"
                    icon={Leaf}
                    patternIndex={1}
                    artifactImage={img}
                    heroImage={img}
                    silhouetteType="leaf"
                    cardRef={(el) => {
                      highlightRefs.current.mostBlend = el;
                    }}
                    onShare={() => handleShareCard("mostBlend")}
                    onStory={() =>
                      setActiveStory({
                        title: t("insights.highlightFavoriteBlend"),
                        value: mostUsedBlend.blend.name,
                        sub: `${mostUsedBlend.count} ${t(
                          "insights.highlightBowls"
                        )}`,
                        accent: "#4A9C6A",
                        icon: Leaf,
                        artifactImage: img,
                        heroImage: img,
                        silhouetteType: "leaf",
                      })
                    }
                  />
                );
              })()}

            {longestStreak > 0 && (
              <HighlightCard
                title={t("insights.highlightLongestStreak")}
                value={`${longestStreak} days`}
                sub={t("insights.highlightConsecutive")}
                accent="#8B5CF6"
                icon={Zap}
                patternIndex={2}
                artifactImage={analyticsImages.streak}
                heroImage={analyticsImages.streak}
                silhouetteType="pipe"
                cardRef={(el) => {
                  highlightRefs.current.streak = el;
                }}
                onShare={() => handleShareCard("streak")}
                onStory={() =>
                  setActiveStory({
                    title: t("insights.highlightLongestStreak"),
                    value: `${longestStreak} days`,
                    sub: t("insights.highlightConsecutive"),
                    accent: "#8B5CF6",
                    icon: Zap,
                    artifactImage: analyticsImages.streak,
                    heroImage: analyticsImages.streak,
                    silhouetteType: "pipe",
                  })
                }
              />
            )}

            {mostValuablePipe &&
              (() => {
                const img = getPipeImage(mostValuablePipe);
                return (
                  <HighlightCard
                    title={t("insights.highlightMostValuable")}
                    value={mostValuablePipe.name}
                    sub={formatCurrency(mostValuablePipe.estimated_value)}
                    accent="#C0392B"
                    icon={Award}
                    patternIndex={3}
                    artifactImage={img}
                    heroImage={img}
                    silhouetteType="pipe"
                    cardRef={(el) => {
                      highlightRefs.current.valuePipe = el;
                    }}
                    onShare={() => handleShareCard("valuePipe")}
                    onStory={() =>
                      setActiveStory({
                        title: t("insights.highlightMostValuable"),
                        value: mostValuablePipe.name,
                        sub: formatCurrency(mostValuablePipe.estimated_value),
                        accent: "#C0392B",
                        icon: Award,
                        artifactImage: img,
                        heroImage: img,
                        silhouetteType: "pipe",
                      })
                    }
                  />
                );
              })()}

            {smokingLogs.length > 0 && (
              <HighlightCard
                title={t("insights.highlightTotalSessions")}
                value={smokingLogs.length}
                sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek")}`}
                accent="#22D3EE"
                icon={Flame}
                patternIndex={4}
                artifactImage={analyticsImages.sessions}
                heroImage={analyticsImages.sessions}
                silhouetteType="pipe"
                cardRef={(el) => {
                  highlightRefs.current.totalSessions = el;
                }}
                onShare={() => handleShareCard("totalSessions")}
                onStory={() =>
                  setActiveStory({
                    title: t("insights.highlightTotalSessions"),
                    value: smokingLogs.length,
                    sub: `${sessionsThisWeek} ${t("insights.snapshotThisWeek")}`,
                    accent: "#22D3EE",
                    icon: Flame,
                    artifactImage: analyticsImages.sessions,
                    heroImage: analyticsImages.sessions,
                    silhouetteType: "pipe",
                  })
                }
              />
            )}

            {blends.length > 0 && (
              <HighlightCard
                title={t("insights.highlightCellarValue")}
                value={formatCurrency(Math.round(totalCollectionValue))}
                sub={`${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`}
                accent="#10B981"
                icon={TrendingUp}
                patternIndex={5}
                artifactImage={analyticsImages.collectionValue}
                heroImage={analyticsImages.collectionValue}
                silhouetteType="leaf"
                cardRef={(el) => {
                  highlightRefs.current.collectionValue = el;
                }}
                onShare={() => handleShareCard("collectionValue")}
                onStory={() =>
                  setActiveStory({
                    title: t("insights.highlightCellarValue"),
                    value: formatCurrency(Math.round(totalCollectionValue)),
                    sub: `${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`,
                    accent: "#10B981",
                    icon: TrendingUp,
                    artifactImage: analyticsImages.collectionValue,
                    heroImage: analyticsImages.collectionValue,
                    silhouetteType: "leaf",
                  })
                }
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-2">
        <CollectionInsightsPanel
          pipes={pipes}
          blends={blends}
          user={user}
          activeTab={initialTab}
        />
      </div>
      </div>
    </div>
  );
}