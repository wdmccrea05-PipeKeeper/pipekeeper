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
import {
  getTobaccoReclassificationCandidates,
  buildReclassificationCandidatesContext,
  buildSpecializationContext,
  buildOptimizationContext,
  buildExpertTobacconistContext,
} from './expertTobacconistHelpers';

export const CURATOR_ACTIONS = [
  {
    id: 'optimize_collection',
    label: 'Optimize Collection',
    description: 'Analyze collection balance, redundancy, and gaps',
    icon: Sparkles,
    modules: ['pipe', 'tobacco'],
    sourceExpert: 'curator_core',
    visibility: (ctx) => true, // Always visible
    buildPrompt: (ctx) => {
      const { pipes = [], blends = [] } = ctx;
      return `Analyze my collection for optimization opportunities.

Consider:
- Collection balance (redundancy, gaps, specialization)
- Usage patterns and rotation effectiveness
- Cellar health and aging potential
- Next best improvements or acquisitions
- Underused or redundant items

Provide specific, actionable recommendations.`;
    },
    buildContext: (ctx) => ({
      type: 'optimize_collection',
      dataRequirement: ['pipes', 'blends', 'logs'],
      sourceExpert: 'curator_core',
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
      const { pipes = [], blends = [], logs = [] } = ctx;
      return `Based on my collection patterns, what specialization directions would strengthen my collection?

Analyze:
- Existing specialization patterns (blend types, pipe shapes, etc.)
- Usage logs for signals about natural preferences
- Gaps that could become new specializations
- Cross-module synergies (e.g., specific blends with specific pipes)

Suggest 2-3 realistic specialization directions that align with observed patterns.`;
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
        b => !b.distillery || !b.region || !b.age_years || !b.abv || !b.whiskey_type
      );

      if (incompleteBottles.length === 0) {
        return 'All bottle records in my collection are complete. Can you suggest metadata fields that would enhance valuation and recommendation accuracy?';
      }

      return `Help me prioritize bottle record enrichment.

Bottles with missing data:
${incompleteBottles.slice(0, 10).map(b => `- ${b.name} (${b.distillery || 'unknown distillery'})`).join('\n')}

For each bottle, identify:
1. Which missing fields are most critical for analytics and valuation
2. Priority order for updates
3. Where to find reliable information
4. How better metadata improves pairing and recommendations`;
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
    description: 'Normalize and improve tobacco blend classifications',
    icon: Tags,
    modules: ['tobacco'],
    sourceExpert: 'expert_tobacconist',
    visibility: (ctx) => {
      const { blends = [] } = ctx;
      return blends.length > 0;
    },
    buildPrompt: (ctx) => {
      const { blends = [] } = ctx;
      const misclassifiedBlends = blends.filter(
        b => !b.blend_type || b.blend_type === 'Other'
      );

      if (misclassifiedBlends.length === 0) {
        return 'All tobacco blends in my collection are properly classified. What can I do to improve classification accuracy for better recommendations and cellar organization?';
      }

      return `Help me reclassify tobacco blends for better organization and recommendations.

Blends needing classification:
${misclassifiedBlends.slice(0, 15).map(b => 
  `- ${b.name} (${b.manufacturer || 'unknown'}${b.flavor_notes ? `, notes: ${b.flavor_notes.join(', ')}` : ''})`
).join('\n')}

For each blend, suggest:
1. Correct blend type classification (English, Virginia, Balkan, etc.)
2. Confidence level for the classification
3. Why the classification matters for pairing and cellar organization
4. Any notable characteristics that affect recommendations`;
    },
    buildContext: (ctx) => ({
      type: 'reclassify_tobacco_blends',
      dataRequirement: ['blends'],
      sourceExpert: 'expert_tobacconist',
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
 */
export function buildActionLaunchContext(action, collectionContext) {
  try {
    const prompt = action.buildPrompt(collectionContext);
    const context = action.buildContext(collectionContext);

    return {
      initialPrompt: prompt,
      sourceAction: action.id,
      sourceExpert: action.sourceExpert,
      recommendationContext: context,
    };
  } catch (e) {
    console.error(`Failed to build launch context for action ${action.id}:`, e);
    return null;
  }
}