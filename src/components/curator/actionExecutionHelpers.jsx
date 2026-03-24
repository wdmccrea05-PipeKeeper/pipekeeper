/**
 * ACTION EXECUTION HELPERS
 * 
 * Separates Curator action execution from normal chat flow.
 * Actions are silent internal workflows, not visible user messages.
 */

/**
 * Analyze bottle preferences from user's whiskey collection
 * Returns profile of taste patterns, gaps, and acquisition opportunities
 */
export function analyzeBottlePreferences(bottles = [], tastingLogs = []) {
  if (!bottles.length) {
    return {
      profile: null,
      acquisition_opportunities: [],
    };
  }

  // Aggregate by type
  const typeMap = {};
  const distilleryMap = {};
  const regionMap = {};
  const abuMap = {};
  const ageMap = {};
  
  let totalRating = 0;
  let ratedCount = 0;
  let peatyCount = 0;
  let premiumCount = 0;
  let finishedCount = 0;

  bottles.forEach((b) => {
    const type = (b.whiskey_type || b.type || 'unknown').toLowerCase();
    const region = (b.region || b.distillery || 'unknown').toLowerCase();
    const isFinished = b.finish && b.finish.toLowerCase() !== 'unfinished';
    const isPeaty = b.profile && b.profile.toLowerCase().includes('peat');
    const isPremium = (Number(b.collector_value) || Number(b.retail_price) || 0) > 100;

    typeMap[type] = (typeMap[type] || 0) + 1;
    distilleryMap[region] = (distilleryMap[region] || 0) + 1;
    regionMap[region] = (regionMap[region] || 0) + 1;
    
    if (b.abv) abuMap[Math.round(Number(b.abv) / 10) * 10] = (abuMap[Math.round(Number(b.abv) / 10) * 10] || 0) + 1;
    if (b.age_years) ageMap[Math.round(Number(b.age_years))] = (ageMap[Math.round(Number(b.age_years))] || 0) + 1;

    if (b.rating) {
      totalRating += Number(b.rating);
      ratedCount++;
    }
    if (isPeaty) peatyCount++;
    if (isPremium) premiumCount++;
    if (isFinished) finishedCount++;
  });

  // Determine preference profile
  const sortedTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
  const topType = sortedTypes[0]?.[0];
  const typeConcentration = topType ? (typeMap[topType] / bottles.length) : 0;

  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 0;
  const peatBias = peatyCount / bottles.length;
  const premiumBias = premiumCount / bottles.length;
  const finishedBias = finishedCount / bottles.length;

  // Build preference profile
  const profile = {
    top_types: sortedTypes.slice(0, 3).map(([type, count]) => ({ type, count })),
    type_concentration: typeConcentration,
    avg_rating: avgRating,
    peat_tendency: peatBias > 0.4 ? 'strong' : peatBias > 0.2 ? 'moderate' : 'low',
    premium_tendency: premiumBias > 0.4 ? 'luxury-focused' : premiumBias > 0.2 ? 'balanced' : 'value-focused',
    finished_preference: finishedBias > 0.4 ? 'finished-leaning' : finishedBias > 0.15 ? 'balanced' : 'unfinished-leaning',
    breadth_strategy: typeConcentration > 0.5 ? 'specialist' : 'diversified',
  };

  // Identify acquisition opportunities
  const opportunities = [];

  // Gap 1: Underrepresented type that fits the user's taste
  if (sortedTypes.length < 4 && typeConcentration > 0.3) {
    const unexploredTypes = ['Rye', 'Bourbon', 'Scotch', 'Irish', 'Japanese', 'World'].filter(
      (t) => !Object.keys(typeMap).some(k => k.includes(t.toLowerCase()))
    );
    if (unexploredTypes.length > 0) {
      opportunities.push({
        category: 'diversification',
        suggestion: `Explore ${unexploredTypes[0]} — complements your ${topType} focus`,
        reason: 'Adjacent style that respects existing taste profile',
        priority: 'medium',
      });
    }
  }

  // Gap 2: Proof balance
  const abuEntries = Object.entries(abuMap).map(([abv, count]) => [Number(abv), count]);
  const avgABV = abuEntries.length > 0 ? abuEntries.reduce((s, [abv, count]) => s + abv * count, 0) / bottles.length : 0;
  if (avgABV < 90 && premiumBias > 0.2) {
    opportunities.push({
      category: 'proof_balance',
      suggestion: 'Higher-proof expression for complexity and richness',
      reason: 'Collection is low-proof biased; higher ABV adds depth',
      priority: 'low',
    });
  }
  if (avgABV > 100 && premiumBias < 0.3) {
    opportunities.push({
      category: 'everyday_drinker',
      suggestion: 'Lower-proof daily drinker to balance premium bottles',
      reason: 'Collection is heavily proof-biased; add approachable option',
      priority: 'medium',
    });
  }

  // Gap 3: Peat/Smoke balance
  if (peatBias < 0.15 && topType === 'bourbon') {
    opportunities.push({
      category: 'flavor_exploration',
      suggestion: 'Peated Islay or Campbeltown Scotch',
      reason: 'Adds smoky counterpoint to bourbon-focused collection',
      priority: 'low',
    });
  }

  // Gap 4: Finish diversity
  if (finishedBias < 0.1) {
    opportunities.push({
      category: 'finish_exploration',
      suggestion: 'Sherry or wine-finished expression',
      reason: 'Finished bottles add richness and complexity',
      priority: 'low',
    });
  }

  return {
    profile,
    acquisition_opportunities: opportunities,
  };
}

/**
 * Build comprehensive bottle addition recommendation context for Optimize Collection
 * Seamlessly integrates with pipe/tobacco optimization logic
 */
export function buildBottleAdditionContext(bottles = [], tastingLogs = []) {
  const { profile, acquisition_opportunities } = analyzeBottlePreferences(bottles, tastingLogs);

  if (!profile) {
    return ''; // No whiskey data
  }

  let context = `WHISKEY COLLECTION ANALYSIS:
Total bottles: ${bottles.length}
Average rating: ${profile.avg_rating.toFixed(1)}/5
Preferred styles: ${profile.top_types.map(t => t.type).join(', ')}
Collection strategy: ${profile.breadth_strategy} (${(profile.type_concentration * 100).toFixed(0)}% concentration in top type)
Peat tendency: ${profile.peat_tendency}
Premium tendency: ${profile.premium_tendency}
Finished preference: ${profile.finished_preference}`;

  if (acquisition_opportunities.length > 0) {
    context += `\n\nBOTTLE ACQUISITION OPPORTUNITIES (in priority order):`;
    acquisition_opportunities
      .sort((a, b) => {
        const priorityMap = { high: 0, medium: 1, low: 2 };
        return (priorityMap[a.priority] || 2) - (priorityMap[b.priority] || 2);
      })
      .forEach((opp) => {
        context += `\n- ${opp.suggestion} (${opp.category})
  Why: ${opp.reason}
  Priority: ${opp.priority}`;
      });
  }

  return context;
}

/**
 * Generate action execution metadata with unique id and status
 * 
 * CRITICAL: Do NOT include initialPrompt for silent actions.
 * The executor will rebuild the prompt internally from action.buildPrompt().
 * This prevents prompt leakage into chat.
 */
export function createActionExecutionContext(action, collectionContext) {
  const executionId = `${action.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  // Build prompt for executor (not for display)
  const prompt = action.buildPrompt(collectionContext);
  const context = action.buildContext(collectionContext);

  const displayLabels = {
    optimize_collection: 'Optimize Collection',
    recommend_specializations: 'Recommend Specializations',
    update_pipe_measurements: 'Update Pipe Measurements',
    update_bottle_data: 'Update Bottle Data',
    reclassify_tobacco_blends: 'Reclassify Tobacco Blends',
  };

  const displayStatuses = {
    optimize_collection: 'Reviewing collection balance and gaps…',
    recommend_specializations: 'Analyzing specialization patterns…',
    update_pipe_measurements: 'Reviewing pipe measurement gaps…',
    update_bottle_data: 'Checking bottle metadata completeness…',
    reclassify_tobacco_blends: 'Reviewing tobacco classifications…',
  };

  return {
    executionId,
    // CRITICALLY: Store prompt in executor-only field, NOT initialPrompt
    _internalPrompt: prompt, // Private field: used only by executeCuratorAction
    actionType: action.id, // Used by routed action effect
    sourceAction: action.id,
    sourceExpert: action.sourceExpert,
    recommendationContext: context,
    executionMode: 'silent_action',
    displayLabel: displayLabels[action.id] || action.id,
    displayStatus: displayStatuses[action.id] || 'Running expert workflow…',
  };
}