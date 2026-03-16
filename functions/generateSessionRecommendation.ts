import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      pipes = [],
      blends = [],
      bottles = [],
      tasteProfile = null,
      userProfile = null,
      mode = 'balanced',
      previousPairings = [],
      sessionHistory = [], // Track last N recommendations to avoid repetition
    } = await req.json();

    // Score items based on mode with distinct weighting strategies
    function scoreItem(item, mode, itemType, tasteProfile, userProfile, sessionHistory = []) {
      let score = 0;
      let debugFactors = {};

      // **BALANCED MODE**: Prioritize favorites + moderately underused + strong ratings
      if (mode === 'balanced') {
        // Base score from favorites and ratings
        if (item.is_favorite) {
          score += 40;
          debugFactors.favorite = 40;
        }
        if (item.rating) {
          const ratingBonus = item.rating * 6;
          score += ratingBonus;
          debugFactors.rating = ratingBonus;
        }
        // Moderate underuse bonus
        const underuse = getUnderUseFactor(item, itemType, tasteProfile);
        const underuseBonus = underuse * 10;
        score += underuseBonus;
        debugFactors.underuse = underuseBonus;
        // Avoid very recent items (1 week)
        const recencyPenalty = getRecencyPenalty(item, 7, 8);
        score -= recencyPenalty;
        debugFactors.recency = -recencyPenalty;
      }

      // **ROTATION MODE**: Heavily prioritize underused items, avoid recent
      else if (mode === 'rotation') {
        // Underuse is primary driver
        const underuse = getUnderUseFactor(item, itemType, tasteProfile);
        const underuseBonus = underuse * 35; // Much higher weight
        score += underuseBonus;
        debugFactors.underuse = underuseBonus;
        // Small rating bonus
        if (item.rating) {
          const ratingBonus = item.rating * 2;
          score += ratingBonus;
          debugFactors.rating = ratingBonus;
        }
        // Strongly penalize recent use (3 days)
        const recencyPenalty = getRecencyPenalty(item, 3, 25);
        score -= recencyPenalty;
        debugFactors.recency = -recencyPenalty;
        // Penalty for favorites (want variety, not same favorites)
        if (item.is_favorite) {
          score -= 15;
          debugFactors.favoriteOverride = -15;
        }
      }

      // **FAVORITES MODE**: Strongly prefer high-rated and favorite items
      else if (mode === 'favorites') {
        // Favorites are very important
        if (item.is_favorite) {
          score += 60;
          debugFactors.favorite = 60;
        }
        // High ratings are critical
        if (item.rating) {
          const ratingBonus = item.rating * 12; // Double weight vs balanced
          score += ratingBonus;
          debugFactors.rating = ratingBonus;
        }
        // Penalize underused (we want familiar favorites)
        const underuse = getUnderUseFactor(item, itemType, tasteProfile);
        score -= underuse * 5;
        debugFactors.underusePenalty = -underuse * 5;
        // Don't heavily penalize recent (we like our favorites)
        const recencyPenalty = getRecencyPenalty(item, 7, 3);
        score -= recencyPenalty;
        debugFactors.recency = -recencyPenalty;
      }

      // **EXPLORATION MODE**: Prioritize untested combinations and diversity
      else if (mode === 'exploration') {
        // Base score
        if (item.rating) {
          const ratingBonus = item.rating * 4;
          score += ratingBonus;
          debugFactors.rating = ratingBonus;
        }
        // Bonus for untested items
        const underuse = getUnderUseFactor(item, itemType, tasteProfile);
        const unexploredBonus = underuse * 25; // High weight for novelty
        score += unexploredBonus;
        debugFactors.unexplored = unexploredBonus;
        // Bonus if not in recent history
        const notInHistory = !sessionHistory.some(h => {
          if (itemType === 'pipe') return h.pipe_id === item.id;
          if (itemType === 'blend') return h.blend_id === item.id;
          if (itemType === 'bottle') return h.whiskey_id === item.id;
          return false;
        });
        if (notInHistory) {
          score += 15;
          debugFactors.notInHistory = 15;
        }
        // Moderate recency penalty
        const recencyPenalty = getRecencyPenalty(item, 5, 12);
        score -= recencyPenalty;
        debugFactors.recency = -recencyPenalty;
      }

      // **RELAXED MODE**: Strongly prefer smoother, easier profiles
      else if (mode === 'relaxed') {
        // Strength is critical for relaxed
        if (itemType === 'blend') {
          if (item.strength === 'Mild') {
            score += 50;
            debugFactors.mildStrength = 50;
          } else if (item.strength === 'Mild-Medium') {
            score += 30;
            debugFactors.mildMedium = 30;
          } else if (item.strength === 'Medium') {
            score += 10;
            debugFactors.medium = 10;
          } else {
            score -= 20; // Penalize strong blends
            debugFactors.strongPenalty = -20;
          }
        }
        // For whiskey, prefer lower ABV and smoother profiles
        if (itemType === 'bottle') {
          if (item.abv && item.abv < 45) {
            score += 30;
            debugFactors.smoothABV = 30;
          }
          // Penalize peated/smoky in relaxed mode
          if (item.flavor_notes?.some(f => f.toLowerCase().includes('peat'))) {
            score -= 25;
            debugFactors.peatedPenalty = -25;
          }
        }
        // Moderate rating bonus
        if (item.rating) {
          const ratingBonus = item.rating * 5;
          score += ratingBonus;
          debugFactors.rating = ratingBonus;
        }
        // Slight recency penalty (familiar comfort is OK)
        const recencyPenalty = getRecencyPenalty(item, 10, 5);
        score -= recencyPenalty;
        debugFactors.recency = -recencyPenalty;
      }

      item._debugFactors = debugFactors;
      return Math.max(0, score);
    }

    // Helper: Calculate underuse factor
    function getUnderUseFactor(item, itemType, tasteProfile) {
      if (!tasteProfile) return 0;
      let avg = 5;
      let usage = 0;
      if (itemType === 'pipe' && tasteProfile.pipe_usage) {
        avg = tasteProfile.pipe_usage.avg || 5;
        usage = tasteProfile.pipe_usage[item.id] || 0;
      } else if (itemType === 'blend' && tasteProfile.blend_usage) {
        avg = tasteProfile.blend_usage.avg || 5;
        usage = tasteProfile.blend_usage[item.id] || 0;
      } else if (itemType === 'bottle' && tasteProfile.bottle_usage) {
        avg = tasteProfile.bottle_usage.avg || 3;
        usage = tasteProfile.bottle_usage[item.id] || 0;
      }
      return Math.max(0, avg - usage);
    }

    // Helper: Calculate recency penalty
    function getRecencyPenalty(item, dayThreshold, maxPenalty) {
      if (!item.last_smoked_date) return 0;
      const lastSmoked = new Date(item.last_smoked_date);
      const daysSince = Math.floor((Date.now() - lastSmoked.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= dayThreshold) return 0;
      return ((dayThreshold - daysSince) / dayThreshold) * maxPenalty;
    }

    // Score all items
    const scoredPipes = pipes
      .map(p => ({ ...p, score: scoreItem(p, mode, 'pipe', tasteProfile, userProfile) }))
      .sort((a, b) => b.score - a.score);

    const scoredBlends = blends
      .map(b => ({ ...b, score: scoreItem(b, mode, 'blend', tasteProfile, userProfile) }))
      .sort((a, b) => b.score - a.score);

    const scoredBottles = bottles
      .map(b => ({ ...b, score: scoreItem(b, mode, 'bottle', tasteProfile, userProfile) }))
      .sort((a, b) => b.score - a.score);

    // Helper: Check if item was recently recommended
    function wasRecentlyRecommended(item, itemType, sessionHistory = []) {
      return sessionHistory.some(h => {
        if (itemType === 'pipe') return h.pipe_id === item.id;
        if (itemType === 'blend') return h.blend_id === item.id;
        if (itemType === 'bottle') return h.whiskey_id === item.id;
        return false;
      });
    }

    // Select items with repetition avoidance
    // For pipes: pick from top candidates, avoiding recent recommendations
    let selectedPipe = null;
    for (const pipe of scoredPipes) {
      if (!wasRecentlyRecommended(pipe, 'pipe', sessionHistory)) {
        selectedPipe = pipe;
        break;
      }
    }
    if (!selectedPipe) selectedPipe = scoredPipes[0] || pipes[0];

    // For blends: pick from top candidates, avoiding recent recommendations
    let selectedBlend = null;
    for (const blend of scoredBlends) {
      if (!wasRecentlyRecommended(blend, 'blend', sessionHistory)) {
        selectedBlend = blend;
        break;
      }
    }
    if (!selectedBlend) selectedBlend = scoredBlends[0] || blends[0];

    // For bottles: pick from top candidates, avoiding recent recommendations
    let selectedBottle = null;
    if (bottles.length > 0) {
      for (const bottle of scoredBottles) {
        if (!wasRecentlyRecommended(bottle, 'bottle', sessionHistory)) {
          selectedBottle = bottle;
          break;
        }
      }
      if (!selectedBottle) selectedBottle = scoredBottles[0] || null;
    }

    // Check pairing compatibility
    function isGoodPairing(pipe, blend, bottle) {
      if (!bottle) return true;

      // Avoid full strength tobacco with light whiskeys
      const fullStrength = blend.strength === 'Full' || blend.strength === 'Medium-Full';
      const lightWhiskey = bottle.type?.includes('Light') || bottle.abv < 40;
      if (fullStrength && lightWhiskey) return false;

      // Avoid Virginia with peated whiskeys
      const isVirginia = blend.blend_type?.includes('Virginia');
      const isPeated = bottle.flavor_notes?.some(f => f.toLowerCase().includes('peat'));
      if (isVirginia && isPeated) return false;

      return true;
    }

    // Try selected bottle, fall back if incompatible
    let selectedBottleForPairing = selectedBottle;
    if (!isGoodPairing(selectedPipe, selectedBlend, selectedBottle)) {
      selectedBottleForPairing = topBottles.find(b => isGoodPairing(selectedPipe, selectedBlend, b)) || selectedBottle;
    }

    // Generate flavor theme
    function generateFlavorTheme(pipe, blend, bottle) {
      const themes = [];

      if (blend.blend_type?.includes('Perique') || blend.blend_type === 'Latakia Blend') {
        themes.push('Rich');
      }
      if (blend.blend_type?.includes('Virginia')) {
        themes.push('Bright');
      }
      if (blend.blend_type?.includes('Aromatic')) {
        themes.push('Sweet');
      }

      if (bottle) {
        if (bottle.type?.includes('Bourbon') || bottle.type?.includes('Rye')) {
          themes.push('Warm');
        }
        if (bottle.flavor_notes?.some(f => f.toLowerCase().includes('peat'))) {
          themes.push('Smoky');
        }
        if (bottle.flavor_notes?.some(f => ['vanilla', 'caramel', 'honey'].some(w => f.toLowerCase().includes(w)))) {
          themes.push('Sweet');
        }
      }

      if (themes.length === 0) themes.push('Balanced');

      // Remove duplicates and create theme string
      const unique = [...new Set(themes)];
      return unique.slice(0, 2).join(' & ') || 'Personalized Experience';
    }

    // Generate rationale
    function generateRationale(pipe, blend, bottle) {
      const pipeDesc = `${pipe.name}${pipe.rating ? ` (rated ${pipe.rating}/5)` : ''}`;
      const blendDesc = `${blend.name}${blend.rating ? ` (rated ${blend.rating}/5)` : ''}`;

      if (bottle) {
        return `Pairing ${blendDesc} tobacco with ${bottle.name} creates a harmonious session. The ${blend.blend_type?.toLowerCase() || 'selected'} tobacco complements the ${bottle.type?.toLowerCase() || 'whiskey'}'s character.`;
      } else {
        return `${blendDesc} in the ${pipeDesc} offers a focused, enjoyable session that matches your collection preferences.`;
      }
    }

    // Generate learning context
    function generateLearningContext(tasteProfile) {
      if (!tasteProfile || tasteProfile.session_count === 0) {
        return 'Initial recommendation from collection data';
      }

      const patterns = tasteProfile.pairing_patterns?.length || 0;
      const sessions = tasteProfile.session_count || 0;

      return `Adapted from ${sessions} session${sessions !== 1 ? 's' : ''} · ${patterns} pairing pattern${patterns !== 1 ? 's' : ''} learned`;
    }

    const flavorTheme = generateFlavorTheme(selectedPipe, selectedBlend, selectedBottleForPairing);
    const rationale = generateRationale(selectedPipe, selectedBlend, selectedBottleForPairing);
    const learningContext = generateLearningContext(tasteProfile);

    const recommendation = {
      pipe: selectedPipe.name,
      pipe_id: selectedPipe.id,
      blend: selectedBlend.name,
      blend_id: selectedBlend.id,
      whiskey: selectedBottleForPairing?.name || null,
      whiskey_id: selectedBottleForPairing?.id || null,
      flavor_theme: flavorTheme,
      rationale,
      learning_context: learningContext,
      mode,
      scores: {
        pipe: selectedPipe.score,
        blend: selectedBlend.score,
        whiskey: selectedBottleForPairing?.score || 0,
      },
    };

    return Response.json(recommendation);
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
});