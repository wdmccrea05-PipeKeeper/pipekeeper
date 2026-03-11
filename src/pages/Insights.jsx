import React, { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { formatCurrency } from "@/components/utils/localeFormatters";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
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
import { differenceInCalendarDays, subDays, isWithinInterval, parseISO } from "date-fns";
import { getBowlsUsed } from "@/components/utils/schemaCompatibility";
import { Badge } from "@/components/ui/badge";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { PIPE_SILHOUETTE_URL } from "@/components/utils/collectionConstants";

const DEFAULT_INSIGHTS_TAB = "log";

function getTabFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("tab") || DEFAULT_INSIGHTS_TAB;
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
// uid must be unique per rendered instance to avoid SVG pattern ID collisions.
function getTextureType(silhouetteType) {
  if (silhouetteType === "pipe") return "woodgrain";
  if (silhouetteType === "leaf") return "paper";
  return "grain";
}

function ArtifactTexture({ type = "grain", accent = "#4A7C9C", uid = "0" }) {
  const safeId = `atex-${type}-${accent.replace("#", "")}-${uid}`;

  if (type === "woodgrain") {
    // Briar / warm wood grain — wavy horizontal lines
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={safeId} x="0" y="0" width="200" height="28" patternUnits="userSpaceOnUse">
            <path d="M0,4 C35,3 65,5 100,4 S165,3 200,4" stroke={accent} strokeWidth="0.55" fill="none" strokeOpacity="0.09" />
            <path d="M0,10 C45,9 85,11 130,10 S175,9 200,10" stroke={accent} strokeWidth="0.38" fill="none" strokeOpacity="0.06" />
            <path d="M0,16 C30,15 70,17 110,16 S170,15 200,16" stroke={accent} strokeWidth="0.50" fill="none" strokeOpacity="0.08" />
            <path d="M0,22 C55,21 95,23 145,22 S185,21 200,22" stroke={accent} strokeWidth="0.32" fill="none" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${safeId})`} />
      </svg>
    );
  }

  if (type === "paper") {
    // Paper label / printed tin texture — fine crosshatch + scattered grain
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={safeId} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="60" stroke={accent} strokeWidth="0.28" strokeOpacity="0.055" />
            <line x1="10" y1="0" x2="10" y2="60" stroke={accent} strokeWidth="0.22" strokeOpacity="0.04" />
            <line x1="20" y1="0" x2="20" y2="60" stroke={accent} strokeWidth="0.28" strokeOpacity="0.05" />
            <line x1="30" y1="0" x2="30" y2="60" stroke={accent} strokeWidth="0.22" strokeOpacity="0.04" />
            <line x1="40" y1="0" x2="40" y2="60" stroke={accent} strokeWidth="0.28" strokeOpacity="0.055" />
            <line x1="50" y1="0" x2="50" y2="60" stroke={accent} strokeWidth="0.22" strokeOpacity="0.04" />
            <line x1="0" y1="0" x2="60" y2="0" stroke={accent} strokeWidth="0.22" strokeOpacity="0.04" />
            <line x1="0" y1="15" x2="60" y2="15" stroke={accent} strokeWidth="0.18" strokeOpacity="0.032" />
            <line x1="0" y1="30" x2="60" y2="30" stroke={accent} strokeWidth="0.22" strokeOpacity="0.04" />
            <line x1="0" y1="45" x2="60" y2="45" stroke={accent} strokeWidth="0.18" strokeOpacity="0.032" />
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

  // Default: "grain" — fine vintage film grain / premium paper noise
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={safeId} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="8"   cy="13"  r="0.48" fill={accent} fillOpacity="0.075" />
          <circle cx="23"  cy="5"   r="0.32" fill={accent} fillOpacity="0.055" />
          <circle cx="42"  cy="19"  r="0.52" fill={accent} fillOpacity="0.07" />
          <circle cx="58"  cy="8"   r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="74"  cy="25"  r="0.44" fill={accent} fillOpacity="0.06" />
          <circle cx="92"  cy="11"  r="0.34" fill={accent} fillOpacity="0.07" />
          <circle cx="105" cy="30"  r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="14"  cy="39"  r="0.38" fill={accent} fillOpacity="0.065" />
          <circle cx="34"  cy="45"  r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="55"  cy="52"  r="0.34" fill={accent} fillOpacity="0.075" />
          <circle cx="77"  cy="41"  r="0.52" fill={accent} fillOpacity="0.065" />
          <circle cx="96"  cy="58"  r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="111" cy="47"  r="0.30" fill={accent} fillOpacity="0.075" />
          <circle cx="7"   cy="65"  r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="28"  cy="72"  r="0.38" fill={accent} fillOpacity="0.06" />
          <circle cx="49"  cy="80"  r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="68"  cy="67"  r="0.34" fill={accent} fillOpacity="0.065" />
          <circle cx="88"  cy="85"  r="0.48" fill={accent} fillOpacity="0.06" />
          <circle cx="103" cy="74"  r="0.38" fill={accent} fillOpacity="0.075" />
          <circle cx="17"  cy="95"  r="0.48" fill={accent} fillOpacity="0.065" />
          <circle cx="39"  cy="103" r="0.34" fill={accent} fillOpacity="0.06" />
          <circle cx="62"  cy="110" r="0.52" fill={accent} fillOpacity="0.075" />
          <circle cx="85"  cy="98"  r="0.38" fill={accent} fillOpacity="0.065" />
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

// ── Snapshot metric cards (top row) ───────────────────────────────────────────
function SnapshotCard({ icon: Icon, label, value, accent = "#4A7C9C", sub, bgImage }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col gap-3 p-4 min-h-[100px]"
      style={{
        background: `linear-gradient(145deg, #1a2535 0%, #111a25 62%, ${accent}28 100%)`,
        border: `1px solid ${accent}50`,
        boxShadow: `0 0 0 1px ${accent}20, 0 4px 24px -4px ${accent}38`,
      }}
    >
      {/* Blurred real collection image layer */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px) brightness(0.15) saturate(0.42)",
            opacity: 0.90,
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Gradient overlay — ensures readability over blurred image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: bgImage
            ? `linear-gradient(145deg, rgba(26,37,53,0.97) 0%, rgba(17,26,37,0.90) 55%, ${accent}28 100%)`
            : `linear-gradient(145deg, transparent 0%, transparent 60%, ${accent}10 100%)`,
        }}
      />

      {/* Grain texture overlay */}
      <ArtifactTexture type="grain" accent={accent} uid={`snap-${accent.replace("#","")}`} />

      {/* Top-right accent glow blob — more prominent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)`,
          transform: "translate(35%, -35%)",
        }}
      />

      {/* Bottom-left ambient bloom */}
      <div
        className="absolute bottom-0 left-0 w-16 h-16 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
          transform: "translate(-25%, 25%)",
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)`,
            border: `1px solid ${accent}50`,
            boxShadow: `0 0 14px ${accent}35, inset 0 1px 0 ${accent}30`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent}cc)` }} />
        </div>
        <span className="text-[11px] text-[#E0D8C8]/55 uppercase tracking-[0.09em] font-semibold leading-tight">
          {label}
        </span>
      </div>

      <div className="relative">
        <div
          className="text-3xl font-bold leading-none tracking-tight"
          style={{ color: "#F5F1E7", textShadow: `0 0 20px ${accent}40` }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] mt-1" style={{ color: `${accent}99` }}>
            {sub}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` }}
      />
    </div>
  );
}

// ── Highlight card (story card grid item) ─────────────────────────────────────
// heroImage — sharp foreground spotlight (item cards only: Most Smoked, Favorite Blend, Most Valuable)
// artifactImage — blurred ambient background (all cards; random collection image for analytics cards)
function HighlightCard({ title, value, sub, accent = "#C87941", icon: Icon, onShare, onStory, cardRef, patternIndex = 0, artifactImage, heroImage, silhouetteType }) {
  // Derive category-appropriate texture: wood grain for pipe, paper for tobacco, grain for general
  const textureType = getTextureType(silhouetteType);
  const heroRotation = silhouetteType === "pipe" ? "12deg" : "-8deg";

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[200px] cursor-default group"
      style={{
        background: `linear-gradient(155deg, #1a2535 0%, #0e1520 45%, ${accent}28 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px -8px ${accent}50, 0 4px 12px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Layer 1 (base gradient is the card background above) */}

      {/* Layer 2a: Ambient blurred background from actual item/collection photo */}
      {artifactImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${artifactImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: heroImage
              ? "blur(22px) brightness(0.26) saturate(0.6)"
              : "blur(20px) brightness(0.22) saturate(0.5)",
            opacity: 0.95,
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* Layer 2b: Hero Pipe Spotlight — sharp <img> entering from right, slightly angled */}
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
              filter: `drop-shadow(0 0 22px ${accent}80) drop-shadow(0 6px 14px rgba(0,0,0,0.65))`,
            }}
          />
          {/* Fade left edge of hero image smoothly into the background */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(10,17,28,1) 0%, rgba(10,17,28,0.42) 38%, transparent 72%)",
            }}
          />
          {/* Ember glow at bottom-right for pipe cards */}
          {silhouetteType === "pipe" && (
            <div
              className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${accent}50 0%, transparent 70%)`,
                transform: "translate(20%, 20%)",
              }}
            />
          )}
          {/* Tin lid ring glow for blend cards */}
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
        /* Analytics cards: no hero — show silhouette watermark instead */
        <>
          {silhouetteType === "pipe" && (
            <div className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none" style={{ opacity: 0.07 }}>
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

      {/* Layer 2c: Directional gradient overlay — dark left (text) → transparent right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: (artifactImage || heroImage)
            ? `linear-gradient(to right, rgba(14,21,32,0.92) 0%, rgba(14,21,32,0.72) 45%, rgba(14,21,32,0.28) 75%, transparent 100%)`
            : `linear-gradient(155deg, rgba(14,21,32,0.72) 0%, rgba(14,21,32,0.52) 45%, ${accent}22 100%)`,
        }}
      />

      {/* Layer 2d: Bottom scrim — darkens text area for legibility over photos */}
      {(artifactImage || heroImage) && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "58%",
            background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Layer 3: Real texture overlay — category-specific */}
      <ArtifactTexture type={textureType} accent={accent} uid={String(patternIndex)} />

      {/* Layer 4: Ambient corner glow */}
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

      {/* Top accent bar — thicker and glowing */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${accent}00 0%, ${accent}ee 35%, ${accent}ff 50%, ${accent}ee 65%, ${accent}00 100%)`,
          boxShadow: `0 0 8px ${accent}cc`,
        }}
      />

      {/* Main content */}
      <div className="relative p-5 pb-3 flex flex-col gap-4 flex-1">
        {/* Top row: icon + share */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl flex items-center justify-center shrink-0"
            style={{
              width: "3.25rem",
              height: "3.25rem",
              background: `linear-gradient(135deg, ${accent}50 0%, ${accent}28 100%)`,
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 18px ${accent}50, inset 0 1px 0 ${accent}40`,
            }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent}cc)` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Story card trigger */}
            {onStory && (
              <button
                onClick={onStory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 opacity-0 group-hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}30`,
                  border: `1px solid ${accent}50`,
                  color: accent,
                }}
                title="View story card"
              >
                <Sparkles className="w-3 h-3" />
                Story
              </button>
            )}
            {/* Share button */}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 opacity-40 hover:opacity-100 active:opacity-100"
                style={{
                  background: `${accent}25`,
                  border: `1px solid ${accent}45`,
                }}
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" style={{ color: accent }} />
              </button>
            )}
          </div>
        </div>

        {/* Story text hierarchy */}
        <div className="space-y-1.5">
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-bold"
            style={{ color: `${accent}ee` }}
          >
            {title}
          </div>
          <div
            className="text-[2.1rem] font-extrabold leading-tight tracking-tight"
            style={{
              color: "#F5F1E7",
              textShadow: `0 2px 10px rgba(0,0,0,0.80), 0 0 28px ${accent}65, 0 0 52px ${accent}28`,
              WebkitTextStroke: "0.4px rgba(255,255,255,0.15)",
            }}
          >
            {value ?? "—"}
          </div>
          {sub && (
            <div
              className="text-xs leading-snug pt-0.5 font-semibold"
              style={{ color: `${accent}cc` }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding + share bar */}
      <div
        className="relative px-5 py-2.5 flex items-center justify-between"
        style={{ borderTop: `1px solid ${accent}20` }}
      >
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bold select-none"
          style={{ color: `${accent}60` }}
        >
          PipeKeeper
        </span>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide font-semibold rounded-md px-2 py-1 transition-all duration-200 opacity-50 hover:opacity-100 active:opacity-100"
            style={{
              color: `${accent}cc`,
              border: `1px solid ${accent}30`,
              background: `${accent}12`,
            }}
          >
            <Share2 className="w-2.5 h-2.5" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}

// ── Full-screen Story / Share card modal ──────────────────────────────────────
function StoryCardModal({ title, value, sub, accent, icon: Icon, onClose, onExport, storyRef, artifactImage, heroImage, silhouetteType }) {
  const storyTextureType = getTextureType(silhouetteType);
  const heroRotation = silhouetteType === "pipe" ? "8deg" : "-5deg";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Story card — portrait oriented */}
      <div
        ref={storyRef}
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden"
        style={{
          width: "min(340px, 90vw)",
          height: "min(560px, 85vh)",
          borderRadius: "24px",
          background: `linear-gradient(175deg, #0e1520 0%, #131d2a 30%, ${accent}35 70%, ${accent}55 100%)`,
          border: `1px solid ${accent}66`,
          boxShadow: `0 0 0 1px ${accent}30, 0 32px 80px -16px ${accent}70, 0 8px 32px rgba(0,0,0,0.6)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Layer 2a: Ambient blurred background from actual item/collection photo */}
        {artifactImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${artifactImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(30px) brightness(0.28) saturate(0.62)",
              opacity: 0.95,
              transform: "scale(1.12)",
            }}
          />
        )}

        {/* Layer 2b: Hero Pipe Spotlight — sharp <img> centered in card, slightly rotated */}
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
                filter: `drop-shadow(0 0 30px ${accent}85) drop-shadow(0 8px 24px rgba(0,0,0,0.65))`,
              }}
            />
            {/* Fade top + bottom edges of hero into the background */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(10,17,28,1) 0%, rgba(10,17,28,0.18) 18%, transparent 40%, rgba(10,17,28,0.18) 78%, rgba(10,17,28,0.85) 100%)",
              }}
            />
            {/* Ember glow below hero for pipe cards */}
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
          /* Analytics / fallback: retain the original blurred crop at bottom */
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
                  filter: "blur(6px) brightness(0.38) saturate(0.80)",
                }}
              />
              {/* Fade hero crop's top edge */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, rgba(10,17,28,1) 0%, rgba(10,17,28,0.55) 35%, transparent 75%)",
                }}
              />
            </div>
          )
        )}

        {/* Layer 2c: Gradient overlay — dark top/edges, reveals hero in lower middle */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: artifactImage
              ? `linear-gradient(175deg, rgba(14,21,32,0.90) 0%, rgba(14,21,32,0.65) 30%, rgba(14,21,32,0.32) 60%, ${accent}30 85%, ${accent}44 100%)`
              : `linear-gradient(175deg, rgba(14,21,32,0.78) 0%, rgba(19,29,42,0.58) 30%, ${accent}28 70%, ${accent}42 100%)`,
          }}
        />

        {/* Silhouette watermark — shown only when no hero image */}
        {!heroImage && silhouetteType === "pipe" && (
          <div
            className="absolute pointer-events-none"
            style={{ bottom: "70px", right: "-20px", width: "200px", height: "200px", opacity: 0.08 }}
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
            style={{ bottom: "70px", right: "-10px", width: "180px", height: "180px", opacity: 0.08 }}
          />
        )}

        {/* Layer 3: Real texture overlay — category-specific */}
        <ArtifactTexture type={storyTextureType} accent={accent} uid="story" />

        {/* Large ambient glow blobs */}
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
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-40px",
            left: "-40px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
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
            Highlight
          </div>
        </div>

        {/* Central content — top-aligned when hero fills the center, otherwise vertically centered */}
        <div
          className="relative flex flex-col items-center px-7 text-center gap-5"
          style={{
            justifyContent: heroImage ? "flex-start" : "center",
            flex: 1,
            paddingTop: heroImage ? "1.25rem" : undefined,
            paddingBottom: heroImage ? "0" : undefined,
          }}
        >
          {/* Icon orb — smaller when hero image is present to save vertical space */}
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

          {/* Category label */}
          <div
            className="text-[11px] uppercase tracking-[0.22em] font-bold"
            style={{ color: `${accent}cc` }}
          >
            {title}
          </div>

          {/* Main stat — huge */}
          <div
            className="font-extrabold leading-none tracking-tighter"
            style={{
              fontSize: "clamp(3.2rem, 12vw, 4.8rem)",
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

        {/* Bottom export action */}
        <div
          className="relative flex items-center justify-center gap-3 px-7 pb-7 pt-4"
          style={{ borderTop: `1px solid ${accent}22` }}
        >
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
              color: "#0e1520",
              boxShadow: `0 0 20px ${accent}60`,
              border: `1px solid ${accent}aa`,
            }}
          >
            <Share2 className="w-4 h-4" />
            Share / Export
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
      logs.map((l) => {
        try {
          return l.date ? l.date.slice(0, 10) : null;
        } catch {
          return null;
        }
      }).filter(Boolean)
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
      currentStreak++;
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
  const initialTab = getTabFromUrl();

  const highlightRefs = useRef({});
  const storyRef = useRef(null);
  // activeStory: { title, value, sub, accent, icon } | null
  const [activeStory, setActiveStory] = useState(null);

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
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
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

  // ---- computed stats ----
  const totalPipeValue = useMemo(
    () => pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0),
    [pipes]
  );
  const totalTobaccoValue = useMemo(
    () => calculateTobaccoCollectionValue(blends, cellarLogs),
    [blends, cellarLogs]
  );
  const totalCellaredOz = useMemo(() => calculateCellaredOzFromLogs(cellarLogs), [cellarLogs]);
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
    [smokingLogs]
  );

  // pipe usage counts
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

  const longestStreak = useMemo(() => computeLongestStreak(smokingLogs), [smokingLogs]);

  const hasData = pipes.length > 0 || blends.length > 0 || smokingLogs.length > 0;

  // ── Analytics card images: stable random picks from the collection ──────────
  // Intentionally depends on collection *size* rather than full arrays so that
  // images are stable within a session and don't flicker on every React Query
  // refetch. A user would need to add/remove items before the picks change.
  const analyticsImages = useMemo(() => {
    const { pipeImgs, blendImgs, allImgs } = gatherCollectionImages(pipes, blends);
    // Helper: prefer category-specific images, fall back to full collection
    const safePickPipe = pickRandom(pipeImgs.length > 0 ? pipeImgs : allImgs);
    const safePickBlend = pickRandom(blendImgs.length > 0 ? blendImgs : allImgs);
    return {
      streak: pickRandom(pipeImgs),
      sessions: pickRandom(allImgs),
      collectionValue: pickRandom(allImgs),
      // Snapshot card backgrounds — use real uploaded imagery where available
      snapshotSessions: safePickPipe,
      snapshotPipes: pickRandom(pipeImgs.length > 0 ? pipeImgs : allImgs),
      snapshotBlends: safePickBlend,
      snapshotValue: pickRandom(allImgs),
      snapshotStreak: safePickPipe,
      snapshotAvg: pickRandom(allImgs),
    };
  }, [pipes.length, blends.length]); // re-pick only when collection size changes

  // ── Share: capture a DOM node and share/download as image ─────────────────
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
          await navigator.share({ files: [file], title: "My PipeKeeper Highlight" });
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
        toast.error(t("insights.shareError", { defaultValue: "Could not share card" }));
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
        toast.error(t("insights.shareError", { defaultValue: "Could not share card" }));
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Story Card Modal ────────────────────────────────── */}
      {activeStory && (
        <StoryCardModal
          {...activeStory}
          storyRef={storyRef}
          onClose={() => setActiveStory(null)}
          onExport={handleExportStory}
        />
      )}

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="relative">
        {/* Subtle background glow behind header */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, #C8794118 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3 py-1">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #6aabc040 0%, #6aabc020 100%)",
                  border: "1px solid #6aabc050",
                  boxShadow: "0 0 16px #6aabc030",
                }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: "#6aabc0", filter: "drop-shadow(0 0 6px #6aabc099)" }} />
              </div>
              <h1
                className="text-3xl font-bold font-serif tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #F5F1E7 0%, #C8B89A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t("insights.title")}
              </h1>
              {hasPaid && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  {t("subscription.proBadge", { defaultValue: "Pro" })}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#E0D8C8]/55 pl-12">{t("insights.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* ── COLLECTION SNAPSHOT CARDS ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SnapshotCard
          icon={Flame}
          label={t("insights.snapshotSessions", { defaultValue: "Total Sessions" })}
          value={smokingLogs.length}
          accent="#C87941"
          sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`}
          bgImage={analyticsImages.snapshotSessions}
        />
        <SnapshotCard
          icon={isAppleBuild ? Leaf : BarChart3}
          label={t("home.pipesInCollection")}
          value={pipes.length}
          accent="#4A7C9C"
          bgImage={analyticsImages.snapshotPipes}
        />
        <SnapshotCard
          icon={Leaf}
          label={t("home.tobaccoBlends")}
          value={blends.length}
          accent="#4A7C59"
          sub={`${totalCellaredOz.toFixed(1)} oz ${t("home.cellared", { defaultValue: "cellared" })}`}
          bgImage={analyticsImages.snapshotBlends}
        />
        <SnapshotCard
          icon={TrendingUp}
          label={t("home.totalValue")}
          value={formatCurrency(Math.round(totalCollectionValue))}
          accent="#C4963A"
          bgImage={analyticsImages.snapshotValue}
        />
        <SnapshotCard
          icon={Clock}
          label={t("insights.snapshotStreak", { defaultValue: "Longest Streak" })}
          value={`${longestStreak}d`}
          accent="#8B5CF6"
          sub={t("insights.snapshotConsecutiveDays", { defaultValue: "consecutive days" })}
          bgImage={analyticsImages.snapshotStreak}
        />
        <SnapshotCard
          icon={Calendar}
          label={t("insights.snapshotAvgWeek", { defaultValue: "Avg / Week" })}
          value={
            smokingLogs.length > 0
              ? (
                  smokingLogs.length /
                  Math.max(
                    1,
                    Math.ceil(
                      differenceInCalendarDays(
                        now,
                        parseISO(smokingLogs[smokingLogs.length - 1]?.date?.slice(0, 10) || now.toISOString().slice(0, 10))
                      ) / 7
                    )
                  )
                ).toFixed(1)
              : "—"
          }
          accent="#22D3EE"
          sub={t("insights.snapshotSessionsPerWeek", { defaultValue: "sessions / week" })}
          bgImage={analyticsImages.snapshotAvg}
        />
      </div>

      {/* ── TOP HIGHLIGHTS ────────────────────────────────── */}
      {hasData && (
        <div className="space-y-6">
          {/* Dramatic section heading */}
          <div className="relative">
            {/* Background glow strip */}
            <div
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, #F59E0B55 40%, #F59E0B55 60%, transparent 100%)" }}
            />
            <div className="relative flex items-center gap-4 py-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #F59E0B35 0%, #F59E0B18 100%)",
                  border: "1px solid #F59E0B45",
                  boxShadow: "0 0 24px #F59E0B35, inset 0 1px 0 #F59E0B30",
                }}
              >
                <Trophy
                  className="w-6 h-6"
                  style={{ color: "#F59E0B", filter: "drop-shadow(0 0 8px #F59E0Bcc)" }}
                />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #F5F1E7 0%, #F59E0B 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("insights.topHighlights", { defaultValue: "Top Highlights" })}
                </h2>
                <p className="text-[11px] text-[#E0D8C8]/45 uppercase tracking-[0.14em] font-semibold mt-0.5">
                  {t("insights.topHighlightsSub", { defaultValue: "Your collector story" })}
                </p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#E0D8C8]/30 font-semibold">
                <Sparkles className="w-3 h-3" />
                Tap a card for story view
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mostUsedPipe && (() => {
              const img = getPipeImage(mostUsedPipe.pipe);
              return (
                <HighlightCard
                  title={t("insights.highlightMostSmoked", { defaultValue: "Most Smoked Pipe" })}
                  value={mostUsedPipe.pipe.name}
                  sub={`${mostUsedPipe.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`}
                  accent="#C87941"
                  icon={Star}
                  patternIndex={0}
                  artifactImage={img}
                  heroImage={img}
                  silhouetteType="pipe"
                  cardRef={(el) => (highlightRefs.current["mostPipe"] = el)}
                  onShare={() => handleShareCard("mostPipe")}
                  onStory={() => setActiveStory({
                    title: t("insights.highlightMostSmoked", { defaultValue: "Most Smoked Pipe" }),
                    value: mostUsedPipe.pipe.name,
                    sub: `${mostUsedPipe.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`,
                    accent: "#C87941",
                    icon: Star,
                    artifactImage: img,
                    heroImage: img,
                    silhouetteType: "pipe",
                  })}
                />
              );
            })()}
            {mostUsedBlend && (() => {
              const img = getBlendImage(mostUsedBlend.blend);
              return (
                <HighlightCard
                  title={t("insights.highlightFavoriteBlend", { defaultValue: "Favorite Blend" })}
                  value={mostUsedBlend.blend.name}
                  sub={`${mostUsedBlend.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`}
                  accent="#4A9C6A"
                  icon={Leaf}
                  patternIndex={1}
                  artifactImage={img}
                  heroImage={img}
                  silhouetteType="leaf"
                  cardRef={(el) => (highlightRefs.current["mostBlend"] = el)}
                  onShare={() => handleShareCard("mostBlend")}
                  onStory={() => setActiveStory({
                    title: t("insights.highlightFavoriteBlend", { defaultValue: "Favorite Blend" }),
                    value: mostUsedBlend.blend.name,
                    sub: `${mostUsedBlend.count} ${t("insights.highlightBowls", { defaultValue: "bowls this period" })}`,
                    accent: "#4A9C6A",
                    icon: Leaf,
                    artifactImage: img,
                    heroImage: img,
                    silhouetteType: "leaf",
                  })}
                />
              );
            })()}
            {longestStreak > 0 && (
              <HighlightCard
                title={t("insights.highlightLongestStreak", { defaultValue: "Longest Streak" })}
                value={`${longestStreak} days`}
                sub={t("insights.highlightConsecutive", { defaultValue: "consecutive smoking days" })}
                accent="#8B5CF6"
                icon={Zap}
                patternIndex={2}
                artifactImage={analyticsImages.streak}
                silhouetteType="pipe"
                cardRef={(el) => (highlightRefs.current["streak"] = el)}
                onShare={() => handleShareCard("streak")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightLongestStreak", { defaultValue: "Longest Streak" }),
                  value: `${longestStreak} days`,
                  sub: t("insights.highlightConsecutive", { defaultValue: "consecutive smoking days" }),
                  accent: "#8B5CF6",
                  icon: Zap,
                  artifactImage: analyticsImages.streak,
                  silhouetteType: "pipe",
                })}
              />
            )}
            {mostValuablePipe && (() => {
              const img = getPipeImage(mostValuablePipe);
              return (
                <HighlightCard
                  title={t("insights.highlightMostValuable", { defaultValue: "Most Valuable Pipe" })}
                  value={mostValuablePipe.name}
                  sub={formatCurrency(mostValuablePipe.estimated_value)}
                  accent="#C0392B"
                  icon={Award}
                  patternIndex={3}
                  artifactImage={img}
                  heroImage={img}
                  silhouetteType="pipe"
                  cardRef={(el) => (highlightRefs.current["valuePipe"] = el)}
                  onShare={() => handleShareCard("valuePipe")}
                  onStory={() => setActiveStory({
                    title: t("insights.highlightMostValuable", { defaultValue: "Most Valuable Pipe" }),
                    value: mostValuablePipe.name,
                    sub: formatCurrency(mostValuablePipe.estimated_value),
                    accent: "#C0392B",
                    icon: Award,
                    artifactImage: img,
                    heroImage: img,
                    silhouetteType: "pipe",
                  })}
                />
              );
            })()}
            {smokingLogs.length > 0 && (
              <HighlightCard
                title={t("insights.highlightTotalSessions", { defaultValue: "Total Sessions Logged" })}
                value={smokingLogs.length}
                sub={`${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`}
                accent="#22D3EE"
                icon={Flame}
                patternIndex={4}
                artifactImage={analyticsImages.sessions}
                silhouetteType="pipe"
                cardRef={(el) => (highlightRefs.current["totalSessions"] = el)}
                onShare={() => handleShareCard("totalSessions")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightTotalSessions", { defaultValue: "Total Sessions Logged" }),
                  value: smokingLogs.length,
                  sub: `${sessionsThisWeek} ${t("insights.snapshotThisWeek", { defaultValue: "this week" })}`,
                  accent: "#22D3EE",
                  icon: Flame,
                  artifactImage: analyticsImages.sessions,
                  silhouetteType: "pipe",
                })}
              />
            )}
            {blends.length > 0 && (
              <HighlightCard
                title={t("insights.highlightCellarValue", { defaultValue: "Collection Value" })}
                value={formatCurrency(Math.round(totalCollectionValue))}
                sub={`${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`}
                accent="#10B981"
                icon={TrendingUp}
                patternIndex={5}
                artifactImage={analyticsImages.collectionValue}
                silhouetteType="leaf"
                cardRef={(el) => (highlightRefs.current["collectionValue"] = el)}
                onShare={() => handleShareCard("collectionValue")}
                onStory={() => setActiveStory({
                  title: t("insights.highlightCellarValue", { defaultValue: "Collection Value" }),
                  value: formatCurrency(Math.round(totalCollectionValue)),
                  sub: `${pipes.length} ${t("home.pipesInCollection")} · ${blends.length} ${t("home.tobaccoBlends")}`,
                  accent: "#10B981",
                  icon: TrendingUp,
                  artifactImage: analyticsImages.collectionValue,
                  silhouetteType: "leaf",
                })}
              />
            )}
          </div>
        </div>
      )}

      {/* ── FULL ANALYTICS PANEL ─────────────────────────── */}
      <CollectionInsightsPanel
        pipes={pipes}
        blends={blends}
        user={user}
        activeTab={initialTab}
      />
    </div>
  );
}
