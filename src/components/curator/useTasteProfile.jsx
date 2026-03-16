import { useMemo } from 'react';

/**
 * useTasteProfile — Adaptive Collector Intelligence Engine
 *
 * Derives a rich taste profile entirely from existing collection data.
 * No new entity required — signals are computed from:
 *   - blend ratings & favorites
 *   - whiskey ratings & favorites
 *   - smoking session logs (pipe usage, blend usage, frequency)
 *   - tasting notes (flavor keywords)
 *   - profile preferences
 *
 * The returned tasteProfile is structured for future ML compatibility:
 *   taste_vectors, pairing_scores, session_outcomes, preference_weights
 */

// Map blend types to flavor profile buckets
const BLEND_FLAVOR_MAP = {
  'English': ['smoky', 'earthy', 'complex'],
  'Latakia Blend': ['smoky', 'earthy', 'complex'],
  'Balkan': ['smoky', 'spicy', 'complex'],
  'Virginia': ['sweet', 'grassy', 'light'],
  'Virginia/Perique': ['sweet', 'spicy', 'medium'],
  'Virginia/Burley': ['nutty', 'earthy', 'medium'],
  'Burley': ['nutty', 'earthy', 'full'],
  'Aromatic': ['sweet', 'fruity', 'mild'],
  'Oriental/Turkish': ['spicy', 'floral', 'complex'],
  'Dark Fired Kentucky': ['smoky', 'full', 'earthy'],
  'Navy Flake': ['sweet', 'full', 'rich'],
  'Cavendish': ['sweet', 'mild', 'smooth'],
};

// Map whiskey flavor notes from tasting notes / type
const WHISKEY_FLAVOR_MAP = {
  'Scotch': ['peated', 'smoky', 'sherried', 'malty'],
  'Bourbon': ['sweet', 'vanilla', 'oaky', 'caramel'],
  'Rye': ['spicy', 'dry', 'complex'],
  'Irish': ['light', 'smooth', 'fruity'],
  'Japanese': ['delicate', 'floral', 'balanced'],
  'Single Malt': ['complex', 'malty', 'varied'],
  'Blended': ['smooth', 'balanced', 'approachable'],
};

function weightedAvg(items, getValue, getWeight = () => 1) {
  if (!items.length) return 0;
  const totalWeight = items.reduce((s, i) => s + getWeight(i), 0);
  if (!totalWeight) return 0;
  return items.reduce((s, i) => s + getValue(i) * getWeight(i), 0) / totalWeight;
}

function topN(obj, n = 3) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function useTasteProfile({
  pipes = [],
  blends = [],
  bottles = [],
  smokingLogs = [],
  tastingLogs = [],
  profile = null,
} = {}) {
  return useMemo(() => {
    // ─── TOBACCO LEARNING ───────────────────────────────────────────
    // Score each blend type by: rating weight, usage frequency, favorites
    const blendTypeScores = {};
    const blendFlavorScores = {};

    blends.forEach(b => {
      const type = b.blend_type || 'Unknown';
      const rating = Number(b.rating) || 0;
      const isFav = b.is_favorite ? 1 : 0;
      const score = (rating / 5) * 2 + isFav;

      blendTypeScores[type] = (blendTypeScores[type] || 0) + score;

      // Accumulate flavor signals from blend type mapping
      const flavors = BLEND_FLAVOR_MAP[type] || [];
      flavors.forEach(f => {
        blendFlavorScores[f] = (blendFlavorScores[f] || 0) + score;
      });
    });

    // Boost by session usage frequency
    smokingLogs.forEach(log => {
      const blend = blends.find(b => b.id === log.blend_id);
      if (!blend) return;
      const type = blend.blend_type || 'Unknown';
      blendTypeScores[type] = (blendTypeScores[type] || 0) + 0.5;
      const flavors = BLEND_FLAVOR_MAP[type] || [];
      flavors.forEach(f => {
        blendFlavorScores[f] = (blendFlavorScores[f] || 0) + 0.3;
      });
    });

    const topBlendTypes = topN(blendTypeScores, 4);
    const topTobaccoFlavors = topN(blendFlavorScores, 5);

    // Average blend rating
    const ratedBlends = blends.filter(b => b.rating > 0);
    const avgBlendRating = ratedBlends.length
      ? weightedAvg(ratedBlends, b => Number(b.rating))
      : 0;

    // Highest rated blend types (≥4 stars avg)
    const blendTypeRatings = {};
    const blendTypeCount = {};
    blends.forEach(b => {
      if (!b.rating) return;
      const t = b.blend_type || 'Unknown';
      blendTypeRatings[t] = (blendTypeRatings[t] || 0) + Number(b.rating);
      blendTypeCount[t] = (blendTypeCount[t] || 0) + 1;
    });
    const preferredBlendTypes = Object.entries(blendTypeRatings)
      .map(([type, total]) => ({ type, avg: total / blendTypeCount[type] }))
      .filter(x => x.avg >= 3.5)
      .sort((a, b) => b.avg - a.avg)
      .map(x => x.type);

    // ─── WHISKEY LEARNING ────────────────────────────────────────────
    const whiskeyTypeScores = {};
    const whiskeyFlavorScores = {};

    bottles.forEach(b => {
      const type = b.whiskey_type || b.type || 'Unknown';
      const rating = Number(b.rating) || 0;
      const isFav = b.is_favorite ? 1 : 0;
      const score = (rating / 5) * 2 + isFav;

      whiskeyTypeScores[type] = (whiskeyTypeScores[type] || 0) + score;

      const flavors = WHISKEY_FLAVOR_MAP[type] || [];
      flavors.forEach(f => {
        whiskeyFlavorScores[f] = (whiskeyFlavorScores[f] || 0) + score;
      });
    });

    // Learn from tasting notes flavor keywords
    tastingLogs.forEach(log => {
      const notes = (log.flavor_notes || []).concat(
        typeof log.tasting_notes === 'string'
          ? log.tasting_notes.toLowerCase().split(/[\s,]+/)
          : []
      );
      const rating = Number(log.rating) || 3;
      const weight = rating / 5;

      notes.forEach(note => {
        const n = note.toLowerCase().trim();
        if (n.length > 2) {
          whiskeyFlavorScores[n] = (whiskeyFlavorScores[n] || 0) + weight;
        }
      });

      // Boost the bottle's type score based on tasting rating
      const bottle = bottles.find(b => b.id === log.bottle_id || b.name === log.bottle_name);
      if (bottle) {
        const type = bottle.whiskey_type || bottle.type || 'Unknown';
        whiskeyTypeScores[type] = (whiskeyTypeScores[type] || 0) + (rating / 5);
      }
    });

    const topWhiskeyTypes = topN(whiskeyTypeScores, 3);
    const topWhiskeyFlavors = topN(whiskeyFlavorScores, 5);

    const ratedBottles = bottles.filter(b => b.rating > 0);
    const avgBottleRating = ratedBottles.length
      ? weightedAvg(ratedBottles, b => Number(b.rating))
      : 0;

    const preferredWhiskeyTypes = Object.entries(
      bottles.reduce((acc, b) => {
        if (!b.rating) return acc;
        const t = b.whiskey_type || b.type || 'Unknown';
        acc[t] = acc[t] || { total: 0, count: 0 };
        acc[t].total += Number(b.rating);
        acc[t].count += 1;
        return acc;
      }, {})
    )
      .map(([type, { total, count }]) => ({ type, avg: total / count }))
      .filter(x => x.avg >= 3.5)
      .sort((a, b) => b.avg - a.avg)
      .map(x => x.type);

    // ─── PIPE LEARNING ───────────────────────────────────────────────
    const pipeUsageCount = {};
    smokingLogs.forEach(log => {
      pipeUsageCount[log.pipe_id] = (pipeUsageCount[log.pipe_id] || 0) + 1;
    });

    // Sort pipes by usage
    const pipesByUsage = [...pipes].sort(
      (a, b) => (pipeUsageCount[b.id] || 0) - (pipeUsageCount[a.id] || 0)
    );

    // Preferred pipe shapes by frequency
    const shapeScores = {};
    pipes.forEach(p => {
      const usage = pipeUsageCount[p.id] || 0;
      const isFav = p.is_favorite ? 2 : 0;
      const score = usage + isFav;
      if (p.shape) shapeScores[p.shape] = (shapeScores[p.shape] || 0) + score;
    });
    const topPipeShapes = topN(shapeScores, 3);

    // Preferred bowl sizes
    const sizeScores = {};
    pipes.forEach(p => {
      const usage = pipeUsageCount[p.id] || 0;
      const isFav = p.is_favorite ? 2 : 0;
      const score = usage + isFav;
      const size = p.sizeClass || p.chamber_volume || 'Unknown';
      if (size !== 'Unknown') sizeScores[size] = (sizeScores[size] || 0) + score;
    });
    const topPipeSizes = topN(sizeScores, 2);

    // Most used pipes (top 3)
    const mostUsedPipes = pipesByUsage
      .filter(p => pipeUsageCount[p.id] > 0)
      .slice(0, 3);

    // Least used pipes (smoked but underused — bottom quartile)
    const usedPipes = pipes.filter(p => pipeUsageCount[p.id] > 0);
    const avgUsage = usedPipes.length
      ? usedPipes.reduce((s, p) => s + (pipeUsageCount[p.id] || 0), 0) / usedPipes.length
      : 0;
    const underusedPipes = usedPipes.filter(
      p => (pipeUsageCount[p.id] || 0) < avgUsage * 0.4
    );
    const neverUsedPipes = pipes.filter(p => !pipeUsageCount[p.id]);

    // ─── PAIRING PATTERN LEARNING ────────────────────────────────────
    // Detect co-occurrence of pipe shape/size + blend type
    const pairingScores = {};
    smokingLogs.forEach(log => {
      const pipe = pipes.find(p => p.id === log.pipe_id);
      const blend = blends.find(b => b.id === log.blend_id);
      if (!pipe || !blend) return;

      const pairKey = `${blend.blend_type || 'unknown'}::${pipe.shape || 'unknown'}`;
      pairingScores[pairKey] = (pairingScores[pairKey] || 0) + 1;
    });

    const topPairings = Object.entries(pairingScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [blendType, pipeShape] = key.split('::');
        return { blendType, pipeShape, count };
      });

    // ─── SESSION PATTERNS ────────────────────────────────────────────
    const sessionCount = smokingLogs.length;
    const favoriteBlends = blends.filter(b => b.is_favorite);
    const favoriteBottles = bottles.filter(b => b.is_favorite);
    const favoritePipes = pipes.filter(p => p.is_favorite);

    // Best rated blend (for Tonight's Session prioritization)
    const bestRatedBlend = ratedBlends.sort((a, b) => Number(b.rating) - Number(a.rating))[0] || favoriteBlends[0] || blends[0];
    const bestRatedBottle = ratedBottles.sort((a, b) => Number(b.rating) - Number(a.rating))[0] || favoriteBottles[0] || bottles[0];
    const mostUsedPipe = mostUsedPipes[0] || favoritePipes[0] || pipes[0];

    // Cross-collection pairing potential
    // Detect if learned tobacco flavors align with learned whiskey flavors
    const smokyCombination =
      topTobaccoFlavors.includes('smoky') && topWhiskeyFlavors.some(f => ['peated', 'smoky'].includes(f));
    const sweetCombination =
      topTobaccoFlavors.includes('sweet') && topWhiskeyFlavors.some(f => ['sweet', 'vanilla', 'caramel'].includes(f));

    // ─── COMPOSITE TASTE PROFILE (ML-compatible structure) ───────────
    return {
      // Core learned preferences
      tobacco_profiles: topBlendTypes,
      preferred_blend_types: preferredBlendTypes,
      tobacco_flavors: topTobaccoFlavors,
      whiskey_profiles: topWhiskeyTypes,
      preferred_whiskey_types: preferredWhiskeyTypes,
      whiskey_flavors: topWhiskeyFlavors,
      pipe_shapes: topPipeShapes,
      pipe_sizes: topPipeSizes,

      // Ratings summary
      avg_blend_rating: avgBlendRating,
      avg_bottle_rating: avgBottleRating,

      // Usage intelligence
      most_used_pipes: mostUsedPipes,
      underused_pipes: underusedPipes,
      never_used_pipes: neverUsedPipes,
      session_count: sessionCount,

      // Favorites
      favorite_blends: favoriteBlends,
      favorite_bottles: favoriteBottles,
      favorite_pipes: favoritePipes,

      // Best rated items (for Tonight's Session)
      best_rated_blend: bestRatedBlend,
      best_rated_bottle: bestRatedBottle,
      most_used_pipe: mostUsedPipe,

      // Pairing patterns (learned from session history)
      pairing_patterns: topPairings,
      has_smoky_combination: smokyCombination,
      has_sweet_combination: sweetCombination,

      // Taste vectors (ML-compatible)
      taste_vectors: {
        tobacco: blendFlavorScores,
        whiskey: whiskeyFlavorScores,
        pipe: shapeScores,
      },

      // Pairing scores (ML-compatible)
      pairing_scores: pairingScores,

      // Data richness — indicates how well-trained the profile is
      confidence: Math.min(
        1,
        (ratedBlends.length * 0.1) +
        (ratedBottles.length * 0.1) +
        (smokingLogs.length * 0.02) +
        (tastingLogs.length * 0.05) +
        (favoriteBlends.length * 0.05) +
        (favoriteBottles.length * 0.05)
      ),

      // For Tonight's Session — ordered priority list
      session_candidates: {
        pipes: [
          ...favoritePipes,
          ...mostUsedPipes,
          ...pipes.filter(p => !favoritePipes.includes(p) && !mostUsedPipes.includes(p)),
        ].slice(0, 10),
        blends: [
          ...favoriteBlends,
          ...(bestRatedBlend ? [bestRatedBlend] : []),
          ...blends.filter(b => !favoriteBlends.includes(b) && b !== bestRatedBlend),
        ].slice(0, 10),
        bottles: [
          ...favoriteBottles,
          ...(bestRatedBottle ? [bestRatedBottle] : []),
          ...bottles.filter(b => !favoriteBottles.includes(b) && b !== bestRatedBottle),
        ].slice(0, 5),
      },
    };
  }, [
    pipes, blends, bottles, smokingLogs, tastingLogs, profile,
  ]);
}

/**
 * Build a rich natural-language summary of the taste profile for injection into Curator prompts.
 */
export function buildTasteProfileContext(tasteProfile) {
  if (!tasteProfile) return '';

  const lines = ['LEARNED TASTE PROFILE (derived from ratings, sessions, and favorites):'];

  if (tasteProfile.preferred_blend_types?.length) {
    lines.push(`Highest-rated tobacco styles: ${tasteProfile.preferred_blend_types.join(', ')}`);
  }
  if (tasteProfile.tobacco_flavors?.length) {
    lines.push(`Inferred tobacco flavor preferences: ${tasteProfile.tobacco_flavors.join(', ')}`);
  }
  if (tasteProfile.preferred_whiskey_types?.length) {
    lines.push(`Highest-rated whiskey styles: ${tasteProfile.preferred_whiskey_types.join(', ')}`);
  }
  if (tasteProfile.whiskey_flavors?.length) {
    lines.push(`Inferred whiskey flavor preferences: ${tasteProfile.whiskey_flavors.join(', ')}`);
  }
  if (tasteProfile.pipe_shapes?.length) {
    lines.push(`Most-used pipe shapes: ${tasteProfile.pipe_shapes.join(', ')}`);
  }
  if (tasteProfile.session_count > 0) {
    lines.push(`Total logged sessions: ${tasteProfile.session_count}`);
  }
  if (tasteProfile.most_used_pipe?.name) {
    lines.push(`Most-used pipe: ${tasteProfile.most_used_pipe.name}`);
  }
  if (tasteProfile.best_rated_blend?.name) {
    lines.push(`Highest-rated blend: ${tasteProfile.best_rated_blend.name} (${tasteProfile.best_rated_blend.rating}/5)`);
  }
  if (tasteProfile.best_rated_bottle?.name) {
    lines.push(`Highest-rated whiskey: ${tasteProfile.best_rated_bottle.name} (${tasteProfile.best_rated_bottle.rating}/5)`);
  }
  if (tasteProfile.pairing_patterns?.length) {
    const top = tasteProfile.pairing_patterns[0];
    lines.push(`Most frequent pairing: ${top.blendType} tobacco + ${top.pipeShape} pipe (${top.count} sessions)`);
  }
  if (tasteProfile.has_smoky_combination) {
    lines.push('Cross-collection affinity: smoky tobacco + peated whiskey combination detected');
  }
  if (tasteProfile.has_sweet_combination) {
    lines.push('Cross-collection affinity: sweet tobacco + bourbon/sweet whiskey combination detected');
  }
  if (tasteProfile.confidence < 0.2) {
    lines.push('Note: Limited data so far — recommendations will improve with more ratings and sessions.');
  }

  return lines.join('\n');
}