import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Session Recommendation Engine
 * 
 * Generates intelligent pipe + blend + whiskey recommendations
 * based on collection data, usage history, and user preferences.
 * 
 * Supports multiple recommendation modes:
 * - Balanced: Favorites + underused items + learned patterns
 * - Rotation: Focus on underused pipes/blends
 * - Favorites: Highest-rated items only
 * - Exploration: New combinations not previously paired
 * - Relaxed: Smooth, easier tobacco + whiskey options
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      pipes = [],
      blends = [],
      bottles = [],
      tasteProfile = null,
      userProfile = null,
      mode = 'balanced',
      previousPairings = [],
    } = body;

    // Validate input
    if (!pipes.length || !blends.length) {
      return Response.json(
        { error: 'Insufficient collection data for recommendation' },
        { status: 400 }
      );
    }

    // ===== CORE RECOMMENDATION ALGORITHM =====

    // Score each pipe based on mode
    const scoredPipes = pipes.map(pipe => {
      let score = 0;

      // Base scores
      if (pipe.is_favorite) score += 30;
      if (pipe.rating) score += pipe.rating * 5;

      // Underused factor (mode-dependent)
      const pipeUsageCount = (tasteProfile?.pipe_usage?.[pipe.id] || 0);
      const avgUsage = pipes.length > 0 
        ? pipes.reduce((sum, p) => sum + (tasteProfile?.pipe_usage?.[p.id] || 0), 0) / pipes.length
        : 0;
      
      const underusedFactor = avgUsage > 0 ? Math.max(0, avgUsage - pipeUsageCount) : 0;

      if (mode === 'rotation') {
        score += underusedFactor * 20;
      } else if (mode === 'favorites') {
        score -= underusedFactor * 10; // Deprioritize underused
      } else if (mode === 'balanced') {
        score += underusedFactor * 8;
      } else if (mode === 'exploration') {
        score += underusedFactor * 15;
      }

      // Avoid recently used
      const lastUsed = tasteProfile?.pipe_last_used?.[pipe.id];
      if (lastUsed) {
        const daysSinceLast = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < 3 && daysSinceLast > 0) {
          score -= (3 - daysSinceLast) * 15;
        }
      }

      // Specialization match (if learned)
      if (tasteProfile?.specialized_pipes?.[pipe.id]) {
        score += 10;
      }

      return { ...pipe, _score: score };
    }).sort((a, b) => b._score - a._score);

    // Score each blend based on mode
    const scoredBlends = blends.map(blend => {
      let score = 0;

      if (blend.is_favorite) score += 30;
      if (blend.rating) score += blend.rating * 5;

      // Underused factor
      const blendUsageCount = tasteProfile?.blend_usage?.[blend.id] || 0;
      const avgBlendUsage = blends.length > 0
        ? blends.reduce((sum, b) => sum + (tasteProfile?.blend_usage?.[b.id] || 0), 0) / blends.length
        : 0;
      
      const blendUnderused = avgBlendUsage > 0 ? Math.max(0, avgBlendUsage - blendUsageCount) : 0;

      if (mode === 'rotation') {
        score += blendUnderused * 20;
      } else if (mode === 'favorites') {
        score -= blendUnderused * 10;
      } else if (mode === 'balanced') {
        score += blendUnderused * 8;
      } else if (mode === 'exploration') {
        score += blendUnderused * 15;
      }

      // Avoid recent blends
      const lastBlendUsed = tasteProfile?.blend_last_used?.[blend.id];
      if (lastBlendUsed) {
        const daysSinceLast = (Date.now() - new Date(lastBlendUsed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < 3 && daysSinceLast > 0) {
          score -= (3 - daysSinceLast) * 15;
        }
      }

      // Strength preference
      if (userProfile?.strength_preference === blend.strength) {
        score += 5;
      }

      // Blend type preference
      if (userProfile?.preferred_blend_types?.includes(blend.blend_type)) {
        score += 8;
      }

      return { ...blend, _score: score };
    }).sort((a, b) => b._score - a._score);

    // Score each bottle
    const scoredBottles = bottles.map(bottle => {
      let score = 0;

      if (bottle.is_favorite) score += 30;
      if (bottle.rating) score += bottle.rating * 5;

      // Underused
      const bottleUsageCount = tasteProfile?.bottle_usage?.[bottle.id] || 0;
      const avgBottleUsage = bottles.length > 0
        ? bottles.reduce((sum, b) => sum + (tasteProfile?.bottle_usage?.[b.id] || 0), 0) / bottles.length
        : 0;
      
      const bottleUnderused = avgBottleUsage > 0 ? Math.max(0, avgBottleUsage - bottleUsageCount) : 0;

      if (mode === 'rotation') {
        score += bottleUnderused * 20;
      } else if (mode === 'favorites') {
        score -= bottleUnderused * 10;
      } else if (mode === 'balanced') {
        score += bottleUnderused * 8;
      } else if (mode === 'exploration') {
        score += bottleUnderused * 15;
      }

      // Avoid recent bottles
      const lastBottleUsed = tasteProfile?.bottle_last_used?.[bottle.id];
      if (lastBottleUsed) {
        const daysSinceLast = (Date.now() - new Date(lastBottleUsed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < 3 && daysSinceLast > 0) {
          score -= (3 - daysSinceLast) * 15;
        }
      }

      // Whiskey type preference
      if (userProfile?.whiskey_preferences?.types?.includes(bottle.type)) {
        score += 8;
      }

      return { ...bottle, _score: score };
    }).sort((a, b) => b._score - a._score);

    // ===== PAIRING LOGIC =====

    // Select top candidates
    const candidatePipes = scoredPipes.slice(0, Math.ceil(pipes.length * 0.4) || 1);
    const candidateBlends = scoredBlends.slice(0, Math.ceil(blends.length * 0.4) || 1);
    const candidateBottles = scoredBottles.slice(0, Math.ceil(bottles.length * 0.4) || 1);

    // Check pairing compatibility
    const checkPairingCompatibility = (pipe, blend, bottle) => {
      // Avoid obvious clashes
      if (blend.strength === 'Full' && bottle.type === 'Light Whiskey') return false;
      if (blend.blend_type === 'Virginia' && bottle.type === 'Peated Scotch') return false;
      
      // Learn from patterns
      const pairingKey = `${pipe.shape || 'unknown'}_${blend.blend_type || 'unknown'}_${bottle.type || 'unknown'}`;
      const hasLearnedPattern = tasteProfile?.pairing_patterns?.some(p => 
        p.pipeShape === pipe.shape && p.blendType === blend.blend_type && p.whiskey_type === bottle.type
      );

      return true; // Default compatible
    };

    // Find best pairing
    const selectedPipe = candidatePipes[0];
    const selectedBlend = candidateBlends[0];
    
    // Find bottle that pairs well
    let selectedBottle = null;
    if (candidateBottles.length > 0) {
      // Try to find learned compatible bottle
      const compatibleBottles = candidateBottles.filter(b => 
        checkPairingCompatibility(selectedPipe, selectedBlend, b)
      );
      selectedBottle = compatibleBottles[0] || candidateBottles[0];
    }

    // Check for new pairings (exploration mode)
    if (mode === 'exploration' && selectedBottle && previousPairings.length > 0) {
      const pairingExists = previousPairings.some(p =>
        p.pipe === selectedPipe.id && 
        p.blend === selectedBlend.id && 
        p.bottle === selectedBottle.id
      );

      if (pairingExists) {
        // Find an untested pairing
        const altBottle = scoredBottles.find(b => 
          !previousPairings.some(p => 
            p.pipe === selectedPipe.id && 
            p.blend === selectedBlend.id && 
            p.bottle === b.id
          )
        );
        if (altBottle) selectedBottle = altBottle;
      }
    }

    // ===== GENERATE EXPLANATION =====

    const explanationParts = [];

    // Pipe explanation
    if (selectedPipe.rating) {
      explanationParts.push(`The ${selectedPipe.name} (rated ${selectedPipe.rating}/5)`);
    } else {
      explanationParts.push(`The ${selectedPipe.name}`);
    }

    // Blend explanation
    const blendStr = selectedBlend.rating 
      ? `${selectedBlend.name} (${selectedBlend.blend_type}, rated ${selectedBlend.rating}/5)`
      : `${selectedBlend.name} (${selectedBlend.blend_type})`;

    // Pairing rationale
    let rationale = `Pairing ${blendStr}`;

    if (selectedBottle) {
      rationale += ` with ${selectedBottle.name} (${selectedBottle.type})`;
      
      // Add flavor reasoning
      if (selectedBlend.flavor_notes?.length > 0 && selectedBottle.type) {
        const blendFlavors = selectedBlend.flavor_notes.slice(0, 2).join(', ');
        rationale += ` creates a balanced session combining ${blendFlavors} tobacco notes with the character of a ${selectedBottle.type}.`;
      } else {
        rationale += ` for a well-balanced evening session.`;
      }
    } else {
      rationale += ` for a focused tobacco experience.`;
    }

    // Add learning context
    const sessionCount = tasteProfile?.session_count || 0;
    const pairingPatterns = tasteProfile?.pairing_patterns?.length || 0;

    const learningContext = sessionCount > 0 || pairingPatterns > 0
      ? `Adapted from ${sessionCount} sessions · ${pairingPatterns} pairing patterns learned`
      : 'Initial recommendation from collection data';

    // ===== FLAVOR THEME =====

    const flavorTheme = (() => {
      if (selectedBottle?.type?.includes('Peated') && selectedBlend.blend_type?.includes('Dark')) {
        return 'Rich & Smoky';
      } else if (selectedBottle?.type?.includes('Bourbon') && selectedBlend.flavor_notes?.some(f => f.includes('Sweet'))) {
        return 'Warm & Sweet';
      } else if (selectedBlend.blend_type === 'Virginia') {
        return 'Bright & Smooth';
      } else if (selectedBlend.blend_type === 'English') {
        return 'Complex & Balanced';
      } else {
        return 'Personalized Experience';
      }
    })();

    return Response.json({
      pipe: selectedPipe?.name || null,
      pipe_id: selectedPipe?.id || null,
      blend: selectedBlend?.name || null,
      blend_id: selectedBlend?.id || null,
      whiskey: selectedBottle?.name || null,
      whiskey_id: selectedBottle?.id || null,
      flavor_theme: flavorTheme,
      rationale,
      learning_context: learningContext,
      mode,
      scores: {
        pipe: selectedPipe?._score || 0,
        blend: selectedBlend?._score || 0,
        whiskey: selectedBottle?._score || 0,
      },
    });

  } catch (error) {
    console.error('[generateSessionRecommendation]', error);
    return Response.json(
      { error: error.message || 'Recommendation failed' },
      { status: 500 }
    );
  }
});