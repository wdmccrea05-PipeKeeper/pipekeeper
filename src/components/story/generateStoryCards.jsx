import { differenceInCalendarDays, parseISO } from "date-fns";
import { Star, Leaf, Zap, Flame, TrendingUp, Award, BarChart3, Heart, Sparkles } from "lucide-react";
import { getBowlsUsed } from "@/components/utils/schemaCompatibility";

/**
 * Generate story cards from user's collection data
 * Returns array of 6-10 portrait cards with imagery and stats
 */
export function generateStoryCards(pipes, blends, smokingLogs, totalCollectionValue, formatCurrency, t) {
  // Guard against missing data
  if (!pipes && !blends && !smokingLogs) {
    return [];
  }

  const cards = [];

  // Helper: get primary image from pipe
  const getPipeImage = (pipe) => {
    if (!pipe) return null;
    return pipe?.photos?.[0] || pipe?.primary_photo || pipe?.image || null;
  };

  // Helper: get primary image from blend
  const getBlendImage = (blend) => {
    if (!blend) return null;
    return blend?.logo || blend?.photo || blend?.tin_image || blend?.brand_logo || null;
  };

  // Compute usage stats
  const pipeUsage = {};
  const blendUsage = {};
  (smokingLogs || []).forEach((l) => {
    if (l?.pipe_id) {
      pipeUsage[l.pipe_id] = (pipeUsage[l.pipe_id] || 0) + (getBowlsUsed(l) || 1);
    }
    if (l?.blend_id) {
      blendUsage[l.blend_id] = (blendUsage[l.blend_id] || 0) + (getBowlsUsed(l) || 1);
    }
  });

  // Most smoked pipe
  const mostUsedPipe = (() => {
    if (!Object.keys(pipeUsage).length) return null;
    const topId = Object.entries(pipeUsage).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0];
    const pipe = (pipes || []).find((p) => p?.id === topId);
    return pipe ? { pipe, count: pipeUsage[topId] || 0 } : null;
  })();

  if (mostUsedPipe) {
    const img = getPipeImage(mostUsedPipe.pipe);
    cards.push({
      title: t("insights.highlightMostSmoked"),
      value: mostUsedPipe.pipe.name,
      sub: `${mostUsedPipe.count} ${t("insights.highlightBowls")}`,
      accent: "#C87941",
      icon: Star,
      heroImage: img,
      bgImage: img,
      silhouetteType: "pipe",
    });
  }

  // Favorite blend
  const mostUsedBlend = (() => {
    if (!Object.keys(blendUsage).length) return null;
    const topId = Object.entries(blendUsage).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0];
    const blend = (blends || []).find((b) => b?.id === topId);
    return blend ? { blend, count: blendUsage[topId] || 0 } : null;
  })();

  if (mostUsedBlend) {
    const img = getBlendImage(mostUsedBlend.blend);
    cards.push({
      title: t("insights.highlightFavoriteBlend"),
      value: mostUsedBlend.blend.name,
      sub: `${mostUsedBlend.count} ${t("insights.highlightBowls")}`,
      accent: "#4A9C6A",
      icon: Leaf,
      heroImage: img,
      bgImage: img,
      silhouetteType: "leaf",
    });
  }

  // Longest streak
  const longestStreak = computeLongestStreak(smokingLogs || []);
  if (longestStreak > 0) {
    const randomPipeImg = (pipes || []).find(p => p?.photos?.length)?.photos?.[0] || null;
    cards.push({
      title: t("insights.highlightLongestStreak"),
      value: `${longestStreak} days`,
      sub: t("insights.highlightConsecutive"),
      accent: "#8B5CF6",
      icon: Zap,
      bgImage: randomPipeImg,
      silhouetteType: "pipe",
    });
  }

  // Total sessions
  if ((smokingLogs || []).length > 0) {
    const randomImg = (pipes || []).find(p => p?.photos?.length)?.photos?.[0] || 
                      (blends || []).find(b => b?.logo || b?.photo)?.logo || 
                      (blends || []).find(b => b?.logo || b?.photo)?.photo || null;
    cards.push({
      title: t("insights.highlightTotalSessions"),
      value: (smokingLogs || []).length,
      sub: t("story.sessionsLogged"),
      accent: "#22D3EE",
      icon: Flame,
      bgImage: randomImg,
      silhouetteType: "pipe",
    });
  }

  // Collection value
  if ((totalCollectionValue || 0) > 0) {
    const randomImg = (pipes || []).find(p => p?.photos?.length)?.photos?.[0] || 
                      (blends || []).find(b => b?.logo || b?.photo)?.logo || null;
    cards.push({
      title: t("insights.highlightCellarValue"),
      value: formatCurrency(Math.round(totalCollectionValue || 0)),
      sub: `${(pipes || []).length} ${t("story.pipes")} · ${(blends || []).length} ${t("story.blends")}`,
      accent: "#C4963A",
      icon: TrendingUp,
      bgImage: randomImg,
      silhouetteType: "leaf",
    });
  }

  // Most valuable pipe
  const mostValuablePipe = (() => {
    if (!(pipes || []).length) return null;
    const top = [...(pipes || [])].sort(
      (a, b) => (Number(b?.estimated_value) || 0) - (Number(a?.estimated_value) || 0)
    )[0];
    return (top?.estimated_value && Number(top.estimated_value) > 0) ? top : null;
  })();

  if (mostValuablePipe) {
    const img = getPipeImage(mostValuablePipe);
    cards.push({
      title: t("insights.highlightMostValuable"),
      value: mostValuablePipe?.name || "Unknown",
      sub: formatCurrency(Number(mostValuablePipe?.estimated_value) || 0),
      accent: "#C0392B",
      icon: Award,
      heroImage: img,
      bgImage: img,
      silhouetteType: "pipe",
    });
  }

  // Collector personality (simple trait based on collection)
  if ((pipes || []).length > 3 || (blends || []).length > 5) {
    const trait = getCollectorPersonality(pipes || [], blends || [], smokingLogs || []);
    cards.push({
      title: t("story.collectorPersonality"),
      value: trait?.label || "Explorer",
      sub: trait?.description || "Building your collection",
      accent: "#A78BFA",
      icon: Sparkles,
      bgImage: (pipes || []).find(p => p?.photos?.length)?.photos?.[0] || null,
      silhouetteType: "pipe",
    });
  }

  // Growth insight
  if ((pipes || []).length > 0 || (blends || []).length > 0) {
    const insight = getGrowthInsight(pipes || [], blends || []);
    cards.push({
      title: t("story.collectionGrowth"),
      value: insight?.label || "Just Beginning",
      sub: insight?.description || "Every collection starts somewhere",
      accent: "#10B981",
      icon: BarChart3,
      bgImage: (blends || []).find(b => b?.logo || b?.photo)?.logo || 
               (blends || []).find(b => b?.logo || b?.photo)?.photo || null,
      silhouetteType: "leaf",
    });
  }

  // Closing share card
  cards.push({
    title: t("story.shareYourStory"),
    value: t("story.appName"),
    sub: t("story.tagline"),
    accent: "#F59E0B",
    icon: Heart,
    bgImage: (pipes || []).find(p => p?.photos?.length)?.photos?.[0] || 
             (blends || []).find(b => b?.logo || b?.photo)?.logo || null,
    silhouetteType: "pipe",
    isClosingCard: true,
  });

  return cards;
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

function getCollectorPersonality(pipes, blends, logs) {
  const pipeCount = (pipes || []).length;
  const blendCount = (blends || []).length;
  const sessionCount = (logs || []).length;

  // Curated collector — high pipes, moderate blends
  if (pipeCount > 10 && blendCount < pipeCount * 1.5) {
    return {
      label: "The Curator",
      description: "You value quality over quantity in your pipe collection"
    };
  }

  // Cellar builder — lots of tobacco
  if (blendCount > 15) {
    return {
      label: "The Cellar Master",
      description: "Building a diverse tobacco library for the ages"
    };
  }

  // Active smoker — high session count
  if (sessionCount > 50) {
    return {
      label: "The Enthusiast",
      description: "A dedicated practitioner of the art"
    };
  }

  // Balanced collector
  if (pipeCount >= 3 && blendCount >= 3) {
    return {
      label: "The Balanced Collector",
      description: "Thoughtfully building pipes and cellar together"
    };
  }

  // Starting the journey
  return {
    label: "The Explorer",
    description: "Just beginning your pipe collecting journey"
  };
}

function getGrowthInsight(pipes, blends) {
  const total = (pipes || []).length + (blends || []).length;

  if (total > 50) {
    return {
      label: "Impressive",
      description: "You've built a serious collection"
    };
  }

  if (total > 20) {
    return {
      label: "Growing Strong",
      description: "Your collection is taking shape beautifully"
    };
  }

  if (total > 10) {
    return {
      label: "Well Started",
      description: "Building a solid foundation"
    };
  }

  return {
    label: "Just Beginning",
    description: "Every great collection starts with a single pipe"
  };
}