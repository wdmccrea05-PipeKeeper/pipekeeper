/**
 * CuratorItemNote.jsx
 *
 * Lightweight Curator micro-surface for individual item detail pages.
 * Shows a small, context-aware advisory note derived from the item's
 * data without requiring a full AI call.
 *
 * This is a secondary surface — not a full chat module.
 * It links back to Curator for deeper exploration.
 *
 * Supports: pipe, tobacco
 * Future: whiskey, cigar, coffee (add generators for each module type)
 */

import React, { useMemo } from "react";
import { Brain, ExternalLink } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { MODULE_TYPES } from "@/platform/moduleTypes";

// ─── Pipe note generator ─────────────────────────────────────────────────────

function getPipeNote(pipe, smokingLogs = []) {
  if (!pipe) return null;

  const pipeSessionLogs = smokingLogs.filter((l) => l.pipe_id === pipe.id);
  const sessionCount = pipeSessionLogs.length;
  const isCollectorOnly = pipe.ai_excluded === true;

  if (isCollectorOnly) {
    return {
      text: "This pipe is marked as collector-only. It is included in your collection value but excluded from rotation and pairing recommendations.",
      tone: "neutral",
    };
  }

  if (sessionCount === 0) {
    return {
      text: "This pipe has no logged sessions yet. Adding sessions helps Curator generate better rotation and pairing recommendations.",
      tone: "tip",
    };
  }

  // Find most recent session
  const sorted = [...pipeSessionLogs].sort((a, b) => {
    const da = new Date(a.date || a.created_at || 0);
    const db = new Date(b.date || b.created_at || 0);
    return db - da;
  });
  const lastSessionDate = sorted[0]?.date || sorted[0]?.created_at;

  if (lastSessionDate) {
    try {
      const daysSinceLast =
        (Date.now() - new Date(lastSessionDate).getTime()) / 86_400_000;
      if (daysSinceLast > 45) {
        return {
          text: `This pipe hasn't been used in over ${Math.round(daysSinceLast)} days. Consider adding it to your next rotation.`,
          tone: "opportunity",
        };
      }
      if (daysSinceLast < 2 && sessionCount > 1) {
        return {
          text: "This pipe was used very recently. Giving it a brief rest before the next session helps preserve flavor quality.",
          tone: "care",
        };
      }
    } catch {
      // ignore date parse errors
    }
  }

  if (sessionCount >= 10) {
    return {
      text: `This pipe has ${sessionCount} logged sessions — a well-seasoned part of your collection.`,
      tone: "positive",
    };
  }

  return null;
}

// ─── Tobacco note generator ───────────────────────────────────────────────────

function getTobaccoNote(blend) {
  if (!blend) return null;

  const isCollectorOnly = blend.ai_excluded === true;
  if (isCollectorOnly) {
    return {
      text: "This blend is marked as collector-only. It is included in your cellar inventory but excluded from pairing and usage recommendations.",
      tone: "neutral",
    };
  }

  const isOpen = blend.status === "open" || blend.is_open === true;
  const blendType = blend.blend_type || blend.blend_family;
  const addedDate = blend.created_at || blend.date_added;

  if (isOpen && addedDate) {
    try {
      const monthsOpen =
        (Date.now() - new Date(addedDate).getTime()) / (30 * 86_400_000);
      if (monthsOpen >= 6) {
        return {
          text: "This tin has been open for several months. Keep it well sealed and consider scheduling it into upcoming sessions.",
          tone: "care",
        };
      }
    } catch {
      // ignore
    }
  }

  if (addedDate) {
    try {
      const yearsInCellar =
        (Date.now() - new Date(addedDate).getTime()) / (365 * 86_400_000);
      if (!isOpen && yearsInCellar >= 2) {
        return {
          text: `Cellared for ${Math.round(yearsInCellar)} year(s). ${
            blendType?.toLowerCase().includes("virginia") ||
            blendType?.toLowerCase().includes("vaper")
              ? "Virginia blends often peak after 3–5 years of proper aging."
              : "Consider sampling to check aging progress."
          }`,
          tone: "opportunity",
        };
      }
    } catch {
      // ignore
    }
  }

  if (blendType) {
    const lcType = blendType.toLowerCase();
    if (lcType.includes("latakia") || lcType.includes("english")) {
      return {
        text: "English/Latakia blends pair well with pipes that have neutral or lightly sweetened chambers.",
        tone: "tip",
      };
    }
    if (lcType.includes("aromatic")) {
      return {
        text: "Aromatic blends can leave lingering sweetness. Consider dedicating a pipe specifically for aromatics.",
        tone: "tip",
      };
    }
  }

  return null;
}

// ─── Tone styles ──────────────────────────────────────────────────────────────

const TONE_STYLES = {
  tip: "text-amber-300/80",
  opportunity: "text-sky-300/80",
  positive: "text-emerald-300/80",
  care: "text-orange-300/80",
  neutral: "text-[#E0D8C8]/60",
};

// ─── CuratorItemNote ──────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {"pipe"|"tobacco"} props.moduleType
 * @param {object} props.item   - The pipe or blend record.
 * @param {object[]} [props.smokingLogs] - Only needed for pipe notes.
 */
export default function CuratorItemNote({ moduleType, item, smokingLogs = [] }) {
  const { t } = useTranslation();

  const note = useMemo(() => {
    if (moduleType === MODULE_TYPES.PIPE) return getPipeNote(item, smokingLogs);
    if (moduleType === MODULE_TYPES.TOBACCO) return getTobaccoNote(item);
    return null;
  }, [moduleType, item, smokingLogs]);

  if (!note) return null;

  const textColor = TONE_STYLES[note.tone] || TONE_STYLES.neutral;

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-start gap-3">
      <Brain
        className="w-4 h-4 text-[#E0D8C8]/30 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-xs font-semibold text-[#E0D8C8]/50 uppercase tracking-wide">
          {t("curator.note.pipeTitle")}
        </div>
        <p className={`text-sm leading-relaxed ${textColor}`}>{note.text}</p>
        <a
          href={createPageUrl("Curator")}
          className="inline-flex items-center gap-1 text-xs text-[#E0D8C8]/40 hover:text-amber-400/80 transition-colors mt-1"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          {t("curator.note.viewInCurator")}
        </a>
      </div>
    </div>
  );
}
