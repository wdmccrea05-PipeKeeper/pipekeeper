/**
 * CURATOR ACTIONS REGISTRY
 * 
 * Canonical registry of expert actions surfaced through Curator.
 * Each action preserves its source expert logic and domain-specific behavior.
 * 
 * Structure:
 * {
 *   id,                    // Unique action identifier
 *   label,                 // Display label
 *   description,           // User-facing description
 *   icon,                  // Lucide icon component
 *   modules,               // Array of required modules (e.g., ['pipe', 'tobacco'])
 *   sourceExpert,          // Legacy expert source (e.g., 'expert_tobacconist')
 *   visibility,            // Function(context) -> boolean
 *   buildPrompt,           // Function(context) -> string
 *   buildContext,          // Function(context) -> object
 *   eventName,             // Analytics event name
 * }
 */

import { Sparkles, Ruler, Droplet, Tags, Target, SearchCheck } from 'lucide-react';
import {
  getTobaccoReclassificationCandidates,
  buildReclassificationCandidatesContext,
  buildSpecializationContext,
  buildOptimizationContext,
  buildExpertTobacconistContext,
} from './expertTobacconistHelpers';
import {
  buildBottleAdditionContext,
  createActionExecutionContext,
} from './actionExecutionHelpers';

export const CURATOR_ACTIONS = [
  {
    id: 'optimize_collection',
    label: 'Optimize Collection',
    description: 'Analyze collection balance, redundancy, and gaps',
    icon: Sparkles,
    modules: ['pipe', 'tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => true, // Always visible
    buildPrompt: (ctx) => {
      const { pipes = [], blends = [], smokingLogs = [], bottles = [], tastingLogs = [] } = ctx;
      const expertContext = buildExpertTobacconistContext(blends, smokingLogs);
      const tobaccoOptContext = buildOptimizationContext(blends, smokingLogs);
      const bottleAdditionContext = buildBottleAdditionContext(bottles, tastingLogs);

      return `You are analyzing this collector's multi-module collection for optimization.

    ${expertContext}

    ${tobaccoOptContext ? `\nTOBACCO OPTIMIZATION:\n${tobaccoOptContext}` : ''}

    ${bottleAdditionContext ? `\n${bottleAdditionContext}` : ''}

    Provide comprehensive optimization recommendations:

    1. **Collection Health Assessment** — Current balance, strengths, and vulnerabilities (across all modules)
    2. **Top 3 Optimization Opportunities** — Specific, actionable improvements with expected impact
    3. **Tobacco Strategies** — Cellar depth, rotation balance, aging potential
    4. **Pipe-Tobacco Synergies** — How to better leverage pipe-blend pairings
    ${bottles.length > 0 ? `5. **Whiskey Addition Strategy** — Bottles that complement your current collection based on demonstrated preferences
    6. **Cross-Module Pairing** — How whiskey, pipes, and tobacco work together for the ideal session
    7. **Acquisition Priority** — Next purchases that would have the highest impact (pipes, blends, bottles)
    8. **What to Preserve** — Strengths to maintain and build upon` : `5. **Acquisition Strategy** — What fills gaps or strengthens specializations
    6. **Priority Ranking** — Which changes have the biggest positive impact
    7. **What to Preserve** — Strengths to maintain and build upon`}

    Be specific and practical, not generic. Ground recommendations in actual collection data.`;
    },
    buildContext: (ctx) => ({
      type: 'optimize_collection',
      dataRequirement: ['pipes', 'blends', 'logs'],
      sourceExpert: 'expert_tobacconist',
    }),
    eventName: 'curator_action_optimize_collection',
  },

  {
    id: 'recommend_specializations',
    label: 'Recommend Specializations',
    description: 'Identify collection strengths and suggest focus areas',
    icon: Target,
    modules: ['pipe', 'tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => true, // Always visible
    buildPrompt: (ctx) => {
      const { pipes = [], blends = [], smokingLogs = [] } = ctx;
      const specContext = buildSpecializationContext(blends, smokingLogs);
      const expertContext = buildExpertTobacconistContext(blends, smokingLogs);

      return `You are analyzing this collector's specialization patterns and opportunities.

  ${expertContext}

  ${specContext}

  Provide detailed specialization recommendations:

  1. **Current Specialization Pattern** — Specialist, focused, balanced, or generalist?
  2. **Strongest Focus Areas** — Which current specializations are working well and why?
  3. **Underexplored Opportunities** — Which families/styles would create natural next specializations?
  4. **Deepening vs. Diversifying** — Should they deepen existing strengths or diversify?
  5. **Specific Recommendations** — Name 2-3 specific specializations with concrete next acquisitions
  6. **Why It Matters** — How specialization improves both collection coherence and smoking enjoyment
  7. **Implementation Priority** — Which to pursue first and why?

  Ground recommendations in actual collection data and usage patterns, not generic preferences.`;
    },
    buildContext: (ctx) => ({
      type: 'recommend_specializations',
      dataRequirement: ['pipes', 'blends', 'logs'],
      sourceExpert: 'expert_tobacconist',
    }),
    eventName: 'curator_action_recommend_specializations',
  },

  {
    id: 'update_pipe_measurements',
    label: 'Update Pipe Measurements',
    description: 'Identify and enrich pipes with missing geometric data',
    icon: Ruler,
    modules: ['pipe'],
    sourceExpert: 'expert_pipe_advisor',
    visibility: (ctx) => {
      const { pipes = [] } = ctx;
      return pipes.length > 0;
    },
    buildPrompt: (ctx) => {
      const { pipes = [] } = ctx;
      const incompletePipes = pipes.filter(
        p => !p.length_mm || !p.bowl_height_mm || !p.bowl_width_mm || !p.bowl_diameter_mm
      );
      
      if (incompletePipes.length === 0) {
        return 'All pipe measurements in my collection are complete. Can you suggest measurement best practices for maintaining consistent records?';
      }

      return `Help me identify and prioritize pipe measurements that need updating.

Pipes needing measurements:
${incompletePipes.slice(0, 10).map(p => `- ${p.name} (${p.maker || 'unknown'})`).join('\n')}

For each pipe, suggest:
1. Which measurements are most valuable to capture
2. Order of priority for updating
3. Tips for accurate measurement
4. When professional assessment might be worthwhile`;
    },
    buildContext: (ctx) => ({
      type: 'update_pipe_measurements',
      dataRequirement: ['pipes'],
      sourceExpert: 'expert_pipe_advisor',
    }),
    eventName: 'curator_action_update_pipe_measurements',
  },

  {
    id: 'update_bottle_data',
    label: 'Update Bottle Data',
    description: 'Identify and enrich whiskey bottles with missing metadata and market valuations',
    icon: Droplet,
    modules: ['whiskey'],
    sourceExpert: 'expert_whiskey_advisor',
    visibility: (ctx) => {
      const { bottles = [] } = ctx;
      return bottles.length > 0;
    },
    buildPrompt: (ctx) => {
      const { bottles = [] } = ctx;
      const incompleteBottles = bottles.filter(
        b => !b.distillery || !b.region || !b.age || !b.abv || !b.type ||
             !b.retail_price || !b.aftermarket_price || !b.collector_value
      );

      if (incompleteBottles.length === 0) {
        return 'All bottle records in my collection are complete. Can you suggest metadata fields that would enhance valuation and recommendation accuracy?';
      }

      const bottleSummaries = incompleteBottles.slice(0, 15).map(b => {
        const missing = [];
        if (!b.distillery) missing.push('distillery');
        if (!b.region) missing.push('region');
        if (!b.age) missing.push('age');
        if (!b.abv) missing.push('abv');
        if (!b.type) missing.push('whiskey type');
        if (!b.retail_price) missing.push('retail price');
        if (!b.aftermarket_price) missing.push('aftermarket price');
        if (!b.collector_value) missing.push('collector value');
        return `- ${b.name}${b.distillery ? ` (${b.distillery})` : ''} — missing: ${missing.join(', ')}`;
      }).join('\n');

      return `Help me enrich and prioritize missing bottle data for my whiskey collection. For each bottle, research and provide:

1. **Core Metadata** — distillery, region, age (years), ABV, whiskey type (e.g. Single Malt, Bourbon, Rye)
2. **Valuation Data** — current retail price (USD), aftermarket/secondary market price (USD), collector value for sealed bottles (USD)
3. **Data Sources** — where to find reliable valuation data (auction sites, retailer listings, etc.)
4. **Priority Order** — which bottles to update first based on collection value impact

Bottles needing enrichment:
${bottleSummaries}

Be specific with price estimates where possible. Use current market knowledge. For each bottle note your confidence level on pricing (high/medium/low).`;
    },
    buildContext: (ctx) => ({
      type: 'update_bottle_data',
      dataRequirement: ['bottles'],
      sourceExpert: 'expert_whiskey_advisor',
    }),
    eventName: 'curator_action_update_bottle_data',
  },

  {
    id: 'reclassify_tobacco_blends',
    label: 'Reclassify Tobacco Blends',
    description: 'Identify and normalize tobacco blend classifications',
    icon: Tags,
    modules: ['tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => {
      const { blends = [] } = ctx;
      return blends.length > 0;
    },
    buildPrompt: (ctx) => {
      const { blends = [], smokingLogs = [] } = ctx;
      const candidates = getTobaccoReclassificationCandidates(blends);
      const candidatesContext = buildReclassificationCandidatesContext(blends);
      const expertContext = buildExpertTobacconistContext(blends, smokingLogs);

      if (candidates.length === 0) {
        return `All tobacco blends in my collection are properly classified.

  ${expertContext}

  How can I improve classification accuracy and metadata quality for even better recommendations and cellar organization? What additional information would strengthen analytics?`;
      }

      return `You are the Expert Tobacconist, reviewing this collection's tobacco blend classifications.

  ${expertContext}

  CLASSIFICATION CANDIDATES:
  ${candidatesContext}

  For each candidate that needs classification:
  1. **Suggest Canonical Value** — What is the correct blend family (from standard taxonomy)?
  2. **Explain Current Issue** — Why is current classification problematic?
  3. **Normalization Mapping** — If user entered a variant (e.g., "va/per" vs "Virginia/Perique"), provide the normalized canonical value
  4. **Confidence Level** — high/medium/low based on available information
  5. **Impact on Recommendations** — How will correct classification improve AI pairing and optimization?
  6. **Next Action** — Reclassify immediately, request more metadata, or accept current state?

  Prioritize recommendations by impact on collection analytics and recommendation quality.`;
    },
    buildContext: (ctx) => ({
      type: 'reclassify_tobacco_blends',
      dataRequirement: ['blends'],
      sourceExpert: 'expert_tobacconist',
      candidates: getTobaccoReclassificationCandidates(ctx.blends || []),
    }),
    eventName: 'curator_action_reclassify_tobacco_blends',
  },

  {
    id: 'optimize_whiskey_collection',
    label: 'Optimize Whiskey Collection',
    description: 'Analyze whiskey balance, redundancy, and tasting gaps',
    icon: Sparkles,
    modules: ['whiskey'],
    sourceExpert: 'expert_whiskey_advisor',
    visibility: (ctx) => {
      const { bottles = [] } = ctx;
      return bottles.length > 0;
    },
    buildPrompt: (ctx) => {
      const { bottles = [], tastingLogs = [] } = ctx;

      return `Analyze my whiskey collection for optimization.

Review:
1. Collection balance across whiskey types, regions, proof, and age
2. Redundancies or overconcentration
3. Untasted or underexplored bottles
4. Priority bottles to open or revisit
5. Missing categories that would strengthen the collection
6. Top 3 optimization opportunities grounded in actual bottle data

Use only my actual collection data and tasting history. Be specific, concise, and practical.`;
    },
    buildContext: (ctx) => ({
      type: 'optimize_whiskey_collection',
      dataRequirement: ['bottles', 'tastingLogs'],
      sourceExpert: 'expert_whiskey_advisor',
    }),
    eventName: 'curator_action_optimize_whiskey_collection',
  },

  {
    id: 'session_builder',
    label: 'Plan Session',
    description: (ctx) => {
      const hasPipes = (ctx?.pipes?.length || 0) > 0;
      const hasBlends = (ctx?.blends?.length || 0) > 0;
      const hasBottles = (ctx?.bottles?.length || 0) > 0;
      const isWhiskeyScope = ctx?.curatorScope === 'whiskeykeeper';
      const isPipeScope = ctx?.curatorScope === 'pipekeeper';

      if ((hasPipes || hasBlends) && hasBottles && !isPipeScope && !isWhiskeyScope) {
        return 'Build a curated pipe, tobacco, and whiskey session';
      }
      if (hasBottles && !hasPipes && !hasBlends) {
        return 'Build a curated whiskey session';
      }
      return 'Build a curated pipe and tobacco session';
    },
    icon: Sparkles,
    modules: ['pipe', 'tobacco', 'whiskey'],
    sourceExpert: 'expert_session_builder',
    visibility: (ctx) => true, // Always visible; prompt handles empty collection gracefully
    buildPrompt: (ctx) => {
      const { pipes = [], blends = [], bottles = [], smokingLogs = [], tastingLogs = [], curatorScope = 'all' } = ctx;
      const hasPipeData = pipes.length > 0 || blends.length > 0;
      const hasWhiskeyData = bottles.length > 0;
      const recentSmokes = smokingLogs
        .slice(0, 5)
        .map((log) => `- ${log.pipe_name || 'Pipe'} + ${log.blend_name || 'Blend'} on ${log.date || 'unknown date'}`)
        .join('\n');
      const recentTastings = tastingLogs
        .slice(0, 5)
        .map((log) => `- ${log.bottle_name || 'Bottle'}${log.rating ? ` (${log.rating}/5)` : ''} on ${log.tasting_date || log.date || 'unknown date'}`)
        .join('\n');

      if (curatorScope === 'whiskeykeeper' || (!hasPipeData && hasWhiskeyData)) {
        return `Plan a whiskey session from my collection.

Use only bottles from my actual collection. Recommend:
1. The best bottle for tonight and why
2. One backup option with a different profile
3. Ideal pour context (relaxed sipping, celebratory, contemplative, etc.)
4. Whether I should log a tasting note afterward
5. Any bottle I should revisit based on my recent tasting history

Recent tastings:
${recentTastings || '- None logged yet'}`;
      }

      if (curatorScope === 'pipekeeper' || (hasPipeData && !hasWhiskeyData)) {
        return `Plan a pipe session from my collection.

Use only pipes and blends from my actual collection. Recommend:
1. The best pipe + tobacco pairing for tonight
2. One backup pairing
3. Why the pairing fits my usage patterns and collection strengths
4. Whether this session helps balance my rotation
5. What I should log afterward

Recent smoking sessions:
${recentSmokes || '- None logged yet'}`;
      }

      return `Plan a combined pipe and whiskey session from my collection.

Use only items I actually own. Recommend:
1. The best pipe for tonight
2. The best tobacco blend for that pipe
3. The best whiskey pairing for that pipe + blend session
4. One backup whiskey or blend option in case I want a different direction
5. Why the pairing works across flavor, strength, mood, and recent usage history
6. What I should log after the session across both PipeKeeper and WhiskeyKeeper

Recent smoking sessions:
${recentSmokes || '- None logged yet'}

Recent tastings:
${recentTastings || '- None logged yet'}`;
    },
    buildContext: (ctx) => ({
      type: 'session_builder',
      mode:
        ctx?.curatorScope === 'whiskeykeeper'
          ? 'whiskey'
          : ctx?.curatorScope === 'pipekeeper'
          ? 'pipe'
          : (ctx?.bottles?.length > 0 && ((ctx?.pipes?.length || 0) > 0 || (ctx?.blends?.length || 0) > 0))
          ? 'combined'
          : (ctx?.bottles?.length > 0 ? 'whiskey' : 'pipe'),
      dataRequirement: ['pipes', 'blends', 'bottles', 'smokingLogs', 'tastingLogs'],
      sourceExpert: 'expert_session_builder',
    }),
    eventName: 'curator_action_session_builder',
  },

  {
    id: 'find_similar_blends',
    label: 'Discover Similar Blends',
    description: 'Find tobacco blends not in your collection similar to your favorites',
    icon: SearchCheck,
    modules: ['tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => {
      const { blends = [] } = ctx;
      return blends.length > 0;
    },
    buildPrompt: () => '',
    buildContext: (ctx) => ({
      type: 'find_similar_blends',
      dataRequirement: ['blends', 'smokingLogs'],
      sourceExpert: 'expert_tobacconist',
    }),
    eventName: 'curator_action_find_similar_blends',
  },

  {
    id: 'find_similar_pipes',
    label: 'Discover Similar Pipes',
    description: 'Find pipes not in your collection similar to ones you love',
    icon: SearchCheck,
    modules: ['pipe'],
    sourceExpert: 'expert_pipe_advisor',
    visibility: (ctx) => {
      const { pipes = [] } = ctx;
      return pipes.length > 0;
    },
    buildPrompt: () => '',
    buildContext: (ctx) => ({
      type: 'find_similar_pipes',
      dataRequirement: ['pipes', 'smokingLogs'],
      sourceExpert: 'expert_pipe_advisor',
    }),
    eventName: 'curator_action_find_similar_pipes',
  },

  {
    id: 'find_similar_bottles',
    label: 'Discover Similar Pours',
    description: 'Find whiskey bottles not in your collection similar to ones you enjoy',
    icon: SearchCheck,
    modules: ['whiskey'],
    sourceExpert: 'expert_whiskey_advisor',
    visibility: (ctx) => {
      const { bottles = [] } = ctx;
      return bottles.length > 0;
    },
    buildPrompt: () => '',
    buildContext: (ctx) => ({
      type: 'find_similar_bottles',
      dataRequirement: ['bottles', 'tastingLogs'],
      sourceExpert: 'expert_whiskey_advisor',
    }),
    eventName: 'curator_action_find_similar_bottles',
  },

  {
    id: 'cigar_smoke_now',
    label: 'What to Smoke Now',
    description: 'Get personalized recommendations from your current humidor',
    icon: Sparkles,
    modules: ['cigar'],
    sourceExpert: 'expert_cigar_advisor',
    visibility: (ctx) => {
      const { cigars = [] } = ctx;
      return cigars.length > 0;
    },
    buildPrompt: (ctx) => {
      const { cigars = [], cigarSessions = [] } = ctx;
      const owned = cigars.filter(c => (c.quantity ?? 0) > 0 || c.unit_type);
      const recentBrands = cigarSessions.slice(0, 10).map(s => s.cigar_name).filter(Boolean);

      return `You are a knowledgeable cigar advisor helping a collector choose what to smoke today.

OWNED CIGARS (${owned.length}):
${owned.slice(0, 20).map(c =>
  `- ${c.brand || ''} ${c.name || ''} ${c.vitola ? `(${c.vitola})` : ''} | ` +
  `Wrapper: ${c.wrapper || '?'} | Body: ${c.body || '?'} | Qty: ${c.quantity || 1} | ` +
  `Ready: ${c.ready_to_smoke_date ? new Date(c.ready_to_smoke_date).toLocaleDateString() : 'now'}`
).join('\n')}

RECENT SESSIONS (last 10 cigars smoked):
${recentBrands.length > 0 ? recentBrands.join(', ') : 'No recent sessions recorded'}

Recommend 3-5 cigars from the owned collection to smoke today. For each:
1. Name the specific cigar
2. Why it's ready now (construction, flavor profile, occasion match)
3. Best pairing suggestion (drink or food)
4. Ideal occasion/setting

Be specific. Reference actual collection data. Avoid generic advice.`;
    },
    buildContext: (ctx) => ({
      type: 'cigar_smoke_now',
      dataRequirement: ['cigars', 'cigarSessions'],
      sourceExpert: 'expert_cigar_advisor',
    }),
    eventName: 'curator_action_cigar_smoke_now',
  },

  {
    id: 'cigar_rest_longer',
    label: 'What Needs More Rest',
    description: 'Identify cigars that would benefit from additional aging',
    icon: Tags,
    modules: ['cigar'],
    sourceExpert: 'expert_cigar_advisor',
    visibility: (ctx) => {
      const { cigars = [] } = ctx;
      return cigars.some(c => c.aging_start_date || c.box_date);
    },
    buildPrompt: (ctx) => {
      const { cigars = [] } = ctx;
      const agingCigars = cigars.filter(c => c.aging_start_date || c.box_date);

      return `You are a cigar aging expert advising on optimal smoking windows.

CIGARS WITH AGING DATA (${agingCigars.length}):
${agingCigars.slice(0, 20).map(c => {
  const ageStart = c.aging_start_date || c.box_date;
  const monthsAged = ageStart
    ? Math.floor((Date.now() - new Date(ageStart).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;
  return `- ${c.brand || ''} ${c.name || ''} ${c.vitola ? `(${c.vitola})` : ''} | ` +
    `Wrapper: ${c.wrapper || '?'} | Body: ${c.body || '?'} | ` +
    `Months aged: ${monthsAged ?? 'unknown'} | Ready date: ${c.ready_to_smoke_date || 'not set'}`;
}).join('\n')}

For each cigar, assess:
1. Current estimated readiness (ready now / needs 6 months / needs 1+ year)
2. What will improve with more rest (construction tightening, strength mellowing, flavor integration)
3. Recommended smoking window

Prioritize cigars that clearly benefit from waiting. Be honest about cigars that are already past peak.`;
    },
    buildContext: (ctx) => ({
      type: 'cigar_rest_longer',
      dataRequirement: ['cigars'],
      sourceExpert: 'expert_cigar_advisor',
    }),
    eventName: 'curator_action_cigar_rest_longer',
  },

  {
    id: 'cigar_buy_again',
    label: 'What to Buy Again',
    description: 'Find your top performers worth restocking based on session history',
    icon: Target,
    modules: ['cigar'],
    sourceExpert: 'expert_cigar_advisor',
    visibility: (ctx) => {
      const { cigarSessions = [] } = ctx;
      return cigarSessions.length >= 3;
    },
    buildPrompt: (ctx) => {
      const { cigars = [], cigarSessions = [] } = ctx;
      const highRated = cigarSessions
        .filter(s => (s.overall_enjoyment ?? 0) >= 4 || s.would_buy_again === 'yes')
        .slice(0, 20);

      return `You are helping a collector identify their best-performing cigars worth restocking.

TOP SESSIONS (rated 4+ or "would buy again"):
${highRated.map(s =>
  `- ${s.cigar_name || s.external_cigar_brand + ' ' + s.external_cigar_name || 'Unknown'} | ` +
  `Enjoyment: ${s.overall_enjoyment || '?'}/5 | ` +
  `Would buy again: ${s.would_buy_again || '?'} | ` +
  `Vitola: ${s.external_cigar_vitola || '?'}`
).join('\n')}

CURRENT INVENTORY:
${cigars.filter(c => (c.quantity ?? 0) > 0).slice(0, 10).map(c =>
  `- ${c.brand || ''} ${c.name || ''}: ${c.quantity || 0} remaining`
).join('\n')}

Recommend:
1. Top 3-5 cigars to restock immediately (low or zero inventory of proven winners)
2. Any cigars worth trying in different vitolas based on enjoyment patterns
3. One new acquisition based on demonstrated taste preferences

Be specific. Name actual brands and lines where you can infer them.`;
    },
    buildContext: (ctx) => ({
      type: 'cigar_buy_again',
      dataRequirement: ['cigars', 'cigarSessions'],
      sourceExpert: 'expert_cigar_advisor',
    }),
    eventName: 'curator_action_cigar_buy_again',
  },

  {
    id: 'cigar_pairing_suggestions',
    label: 'Pairing Suggestions',
    description: 'Get drink and food pairing ideas tailored to your collection',
    icon: Droplet,
    modules: ['cigar'],
    sourceExpert: 'expert_cigar_advisor',
    visibility: (ctx) => {
      const { cigars = [] } = ctx;
      return cigars.length > 0;
    },
    buildPrompt: (ctx) => {
      const { cigars = [], bottles = [] } = ctx;
      // Cap items to keep prompt fast and deterministic
      const smokeable = cigars.filter(c => (c.quantity ?? 0) > 0 || c.unit_type).slice(0, 5);
      const bottleList = bottles.slice(0, 5);
      const hasBottles = bottleList.length > 0;

      return `You are a pairing expert for premium cigars. Generate focused pairing recommendations.

PAIRING RULES:
- "direct_pairing": one cigar paired with one specific drink for tonight
- "collection_mix_match": a set of cigar+drink options from the full collection
- NEVER suggest smoking a pipe and a cigar at the same time
- NEVER suggest drinking whiskey and wine simultaneously
- NEVER combine all items into one simultaneous experience
- Each individual recommendation pairs exactly TWO things: one cigar + one drink (even within a mix-and-match set, each entry is a two-item pairing)

CIGARS (${smokeable.length} available):
${smokeable.map(c =>
  `- ${c.brand || ''} ${c.name || ''} | Body: ${c.body || '?'} | Wrapper: ${c.wrapper || '?'}`
).join('\n')}

${hasBottles ? `WHISKEY COLLECTION (${bottleList.length} bottles):
${bottleList.map(b => `- ${b.distillery || b.brand || ''} ${b.name || ''} ${b.whiskey_type || ''}`).join('\n')}

` : ''}Generate exactly these recommendations:
1. Best direct pairing for tonight (one cigar + one spirit)
${hasBottles ? '2. Best cigar + specific whiskey match from owned bottles (direct_pairing)' : '2. Best cigar + non-alcoholic pairing (direct_pairing)'}
3. Top 2-3 mix-and-match options across the collection (collection_mix_match)
4. Any cigars currently lacking strong pairing options

For each recommendation set:
- pairingMode: "direct_pairing" or "collection_mix_match"
- what is being paired (specific items from the collection above)
- why they go together (1 sentence)
- what inventory was considered`;
    },
    buildContext: (ctx) => ({
      type: 'cigar_pairing_suggestions',
      dataRequirement: ['cigars', 'bottles'],
      sourceExpert: 'expert_cigar_advisor',
    }),
    eventName: 'curator_action_cigar_pairing_suggestions',
  },
];

/**
 * Check if an action matches the selected curator scope
 */
function actionMatchesScope(action, curatorScope) {
  if (!curatorScope || curatorScope === "all") return true;

  const modules = Array.isArray(action.modules) ? action.modules : [];

  if (curatorScope === "pipekeeper") {
    return modules.includes("pipe") || modules.includes("tobacco");
  }

  if (curatorScope === "whiskeykeeper") {
    return modules.includes("whiskey");
  }

  if (curatorScope === "cigarkeeper") {
    return modules.includes("cigar");
  }

  return true;
}

/**
 * Get visible actions for current collection context
 */
export function getVisibleActions(context) {
  const curatorScope = context?.curatorScope || "all";

  return CURATOR_ACTIONS.filter((action) => {
    if (!actionMatchesScope(action, curatorScope)) {
      return false;
    }

    if (!action.visibility) return true;

    try {
      return action.visibility(context);
    } catch (e) {
      console.warn(`Action visibility check failed for ${action.id}:`, e);
      return false;
    }
  });
}

/**
 * Build launch context from an action
 * NEW: Includes execution metadata for silent action handling
 */
export function buildActionLaunchContext(action, collectionContext) {
  try {
    return createActionExecutionContext(action, collectionContext);
  } catch (e) {
    console.error(`Failed to build launch context for action ${action.id}:`, e);
    return null;
  }
}