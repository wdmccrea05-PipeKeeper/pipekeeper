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
    } = await req.json();

    // Score items based on mode
    function scoreItem(item, mode, itemType, tasteProfile, userProfile) {
      let score = 0;

      // Favorites and ratings
      if (item.is_favorite) score += 30;
      if (item.rating) score += item.rating * 5;

      // Calculate underuse factor
      let underuseFactor = 0;
      if (tasteProfile && itemType === 'pipe' && tasteProfile.pipe_usage) {
        const avgUsage = tasteProfile.pipe_usage.avg || 5;
        const itemUsage = tasteProfile.pipe_usage[item.id] || 0;
        underuseFactor = Math.max(0, avgUsage - itemUsage);
      } else if (tasteProfile && itemType === 'blend' && tasteProfile.blend_usage) {
        const avgUsage = tasteProfile.blend_usage.avg || 5;
        const itemUsage = tasteProfile.blend_usage[item.id] || 0;
        underuseFactor = Math.max(0, avgUsage - itemUsage);
      } else if (tasteProfile && itemType === 'bottle' && tasteProfile.bottle_usage) {
        const avgUsage = tasteProfile.bottle_usage.avg || 3;
        const itemUsage = tasteProfile.bottle_usage[item.id] || 0;
        underuseFactor = Math.max(0, avgUsage - itemUsage);
      }

      // Mode-specific underuse scoring
      if (mode === 'rotation') {
        score += underuseFactor * 20;
      } else if (mode === 'balanced') {
        score += underuseFactor * 8;
      } else if (mode === 'favorites') {
        score -= underuseFactor * 10; // Penalize underused in favorites mode
      } else if (mode === 'exploration') {
        score += underuseFactor * 15;
      } else if (mode === 'relaxed') {
        // Prefer mild strength
        if (itemType === 'blend' && item.strength === 'Mild') {
          score += 15;
        } else if (itemType === 'blend' && item.strength === 'Mild-Medium') {
          score += 8;
        }
      }

      // Avoid recently used items
      if (item.last_smoked_date) {
        const lastSmoked = new Date(item.last_smoked_date);
        const daysSince = Math.floor((Date.now() - lastSmoked.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 3) {
          score -= (3 - daysSince) * 15;
        }
      }

      // Check previous pairings (for exploration mode)
      if (mode === 'exploration' && previousPairings.length > 0) {
        const usedBefore = previousPairings.some(p => {
          if (itemType === 'pipe') return p.pipe_id === item.id;
          if (itemType === 'blend') return p.blend_id === item.id;
          if (itemType === 'bottle') return p.bottle_id === item.id;
          return false;
        });
        if (!usedBefore) score += 20; // Bonus for untested items
      }

      return Math.max(0, score);
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

    // Select top 40% from each category
    const topPipes = scoredPipes.slice(0, Math.max(1, Math.ceil(pipes.length * 0.4)));
    const topBlends = scoredBlends.slice(0, Math.max(1, Math.ceil(blends.length * 0.4)));
    const topBottles = scoredBottles.slice(0, Math.max(1, Math.ceil(bottles.length * 0.4)));

    // Pick best from each category
    const selectedPipe = topPipes[0] || pipes[0];
    const selectedBlend = topBlends[0] || blends[0];
    const selectedBottle = topBottles.length > 0 ? topBottles[0] : null;

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