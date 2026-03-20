import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * ACTION APPLY HANDLERS
 * 
 * These handlers commit structured action recommendations to the database.
 * Each handler performs the actual update and returns success/failure status.
 */

/**
 * Apply pipe specialization changes
 */
export async function applyPipeSpecializations(groups, pipeData = {}) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const group of groups) {
    for (const item of group.items) {
      if (item.proposedChange?.type !== 'pipe_specialization') continue;

      try {
        const { pipeName, specialization } = item.proposedChange.payload;
        
        // Find pipe by name
        const allPipes = await base44.entities.Pipe.list();
        const pipe = allPipes.find(p => p.name === pipeName);
        
        if (!pipe) {
          throw new Error(`Pipe "${pipeName}" not found`);
        }

        // Update pipe with focus/specialization
        const focusArray = Array.isArray(pipe.focus) ? [...pipe.focus] : [];
        if (!focusArray.includes(specialization)) {
          focusArray.push(specialization);
        }

        await base44.entities.Pipe.update(pipe.id, {
          focus: focusArray,
        });

        results.success++;
        toast.success(`${pipeName} specialization applied`);
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);
        toast.error(`Failed to apply specialization: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Apply tobacco blend reclassifications
 */
export async function applyTobaccoReclassifications(groups) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const group of groups) {
    for (const item of group.items) {
      if (item.proposedChange?.type !== 'tobacco_classification') continue;

      try {
        const { blendName, blendType } = item.proposedChange.payload;
        
        // Find blend by name
        const allBlends = await base44.entities.TobaccoBlend.list();
        const blend = allBlends.find(b => b.name === blendName);
        
        if (!blend) {
          throw new Error(`Blend "${blendName}" not found`);
        }

        // Update blend classification
        await base44.entities.TobaccoBlend.update(blend.id, {
          blend_type: blendType,
        });

        results.success++;
        toast.success(`${blendName} reclassified to ${blendType}`);
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);
        toast.error(`Failed to reclassify: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Apply collection optimization changes (pipes + tobacco + bottles)
 */
export async function applyCollectionOptimization(groups) {
  const results = {
    pipeSpecializations: { success: 0, failed: 0, errors: [] },
    tobaccoReclassifications: { success: 0, failed: 0, errors: [] },
    bottleSuggestions: { success: 0, failed: 0, errors: [] },
    collectionReviews: { success: 0, failed: 0, errors: [] },
  };

  for (const group of groups) {
    for (const item of group.items) {
      const changeType = item.proposedChange?.type;

      if (changeType === 'pipe_specialization') {
        try {
          const { pipeName, specialization } = item.proposedChange.payload;
          const allPipes = await base44.entities.Pipe.list();
          const pipe = allPipes.find(p => p.name === pipeName);
          
          if (pipe) {
            const focusArray = Array.isArray(pipe.focus) ? [...pipe.focus] : [];
            if (!focusArray.includes(specialization)) {
              focusArray.push(specialization);
            }
            await base44.entities.Pipe.update(pipe.id, { focus: focusArray });
            results.pipeSpecializations.success++;
          } else {
            throw new Error(`Pipe "${pipeName}" not found`);
          }
        } catch (err) {
          results.pipeSpecializations.failed++;
          results.pipeSpecializations.errors.push(err.message);
        }
      }

      else if (changeType === 'tobacco_classification') {
        try {
          const { blendName, blendType } = item.proposedChange.payload;
          const allBlends = await base44.entities.TobaccoBlend.list();
          const blend = allBlends.find(b => b.name === blendName);
          
          if (blend) {
            await base44.entities.TobaccoBlend.update(blend.id, {
              blend_type: blendType,
            });
            results.tobaccoReclassifications.success++;
          } else {
            throw new Error(`Blend "${blendName}" not found`);
          }
        } catch (err) {
          results.tobaccoReclassifications.failed++;
          results.tobaccoReclassifications.errors.push(err.message);
        }
      }

      else if (changeType === 'bottle_addition_suggestion') {
        // These are suggestions, not direct updates
        results.bottleSuggestions.success++;
        toast.info(`Bottle suggestion: ${item.itemName}`);
      }

      else if (changeType === 'collection_review') {
        // These are reviews for the user to consider
        results.collectionReviews.success++;
      }
    }
  }

  // Summary toast
  const totalSuccess = 
    results.pipeSpecializations.success +
    results.tobaccoReclassifications.success +
    results.bottleSuggestions.success;
  
  if (totalSuccess > 0) {
    toast.success(`Applied ${totalSuccess} recommendations to your collection`);
  }

  return results;
}

/**
 * Open Curator for clarification with clean context
 */
export function buildClarificationPrompt(clarificationContext) {
  const { actionId, title, selectedItems } = clarificationContext;

  if (!selectedItems || selectedItems.length === 0) {
    // Generic clarification
    return `I have a question about the ${title} recommendations. Can you provide more detail about why these changes are recommended?`;
  }

  // Item-specific clarification
  const itemList = selectedItems
    .map(item => `- ${item.itemName}: ${item.issue}`)
    .join('\n');

  return `I'd like to understand more about these recommendations:

${itemList}

Can you explain the reasoning in more detail?`;
}

/**
 * Generic handler dispatcher
 */
export async function applyActionChanges(actionId, groups) {
  try {
    switch (actionId) {
      case 'optimize_collection':
        return await applyCollectionOptimization(groups);
      case 'recommend_specializations':
        return await applyPipeSpecializations(groups);
      case 'reclassify_tobacco_blends':
        return await applyTobaccoReclassifications(groups);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  } catch (err) {
    console.error('Apply action failed:', err);
    toast.error(`Failed to apply changes: ${err.message}`);
    throw err;
  }
}