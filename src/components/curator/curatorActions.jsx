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

import { Sparkles, Ruler, Droplet, Tags, Target } from 'lucide-react';
import { isInternalModuleTester } from '@/components/utils/moduleReleaseState';
import {
  getTobaccoReclassificationCandidates,
  buildReclassificationCandidatesContext,
  buildSpecializationContext,
  buildOptimizationContext,
  buildExpertTobacconistContext,
} from './expertTobacconistHelpers';
import {
  analyzeBottlePreferences,
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
    description: 'Identify and enrich whiskey bottles with missing metadata',
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
];

/**
 * Get visible actions for current collection context
 */
export function getVisibleActions(context) {
  return CURATOR_ACTIONS.filter(action => {
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