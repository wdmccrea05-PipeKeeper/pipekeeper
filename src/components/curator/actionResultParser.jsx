/**
 * ACTION RESULT PARSER
 * 
 * Transforms AI-generated recommendations into structured action outputs
 * that can be rendered as interactive decision cards.
 * 
 * All action responses are parsed into this canonical format:
 * {
 *   actionId,
 *   title,
 *   summary,
 *   groups: [
 *     {
 *       groupTitle,
 *       items: [
 *         {
 *           id,
 *           type, // pipe | tobacco | bottle | collection
 *           itemId,
 *           itemName,
 *           issue,
 *           recommendation,
 *           proposedChange: {
 *             type, // pipe_specialization | tobacco_classification | etc.
 *             payload: {...}
 *           },
 *           confidence // 0-1
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

/**
 * Parse optimize_collection action response
 */
export function parseOptimizeCollectionResult(aiResponse, context = {}) {
  // Extract structured recommendations from freeform AI response
  // This is a pattern-matching approach since AI outputs vary
  
  const groups = [];
  const lines = (aiResponse || '').split('\n').filter(l => l.trim());
  
  let currentGroup = null;
  let pipeRecs = [];
  let tobaccoRecs = [];
  let bottleRecs = [];
  let collectionIssues = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Detect group headers
    if (trimmed.match(/pipe.*reclassif|specializ/i)) {
      currentGroup = 'pipes';
    } else if (trimmed.match(/tobacco.*classif|blend.*normal/i)) {
      currentGroup = 'tobacco';
    } else if (trimmed.match(/bottle.*add|whiskey.*add|acquisition/i)) {
      currentGroup = 'bottles';
    } else if (trimmed.match(/collection.*gap|balance|diversif/i)) {
      currentGroup = 'collection';
    }
    
    // Parse recommendations based on context
    if (currentGroup === 'pipes' && trimmed.match(/[-•]/)) {
      const match = trimmed.match(/([^:]+):\s*(.+)/);
      if (match) {
        pipeRecs.push({
          pipeName: match[1].trim(),
          recommendation: match[2].trim(),
        });
      }
    } else if (currentGroup === 'tobacco' && trimmed.match(/[-•]/)) {
      const match = trimmed.match(/([^:]+):\s*(.+)/);
      if (match) {
        tobaccoRecs.push({
          blendName: match[1].trim(),
          recommendation: match[2].trim(),
        });
      }
    } else if (currentGroup === 'bottles' && trimmed.match(/[-•]/)) {
      const match = trimmed.match(/([^:]+):\s*(.+)/);
      if (match) {
        bottleRecs.push({
          suggestion: match[1].trim(),
          reason: match[2].trim(),
        });
      }
    } else if (currentGroup === 'collection' && trimmed.match(/[-•]/)) {
      collectionIssues.push(trimmed.replace(/^[-•]\s*/, ''));
    }
  });
  
  // Build groups
  if (pipeRecs.length > 0) {
    groups.push({
      groupTitle: `Pipe Specializations (${pipeRecs.length})`,
      items: pipeRecs.map((rec, idx) => ({
        id: `pipe-spec-${idx}`,
        type: 'pipe',
        itemName: rec.pipeName,
        issue: 'No current specialization',
        recommendation: rec.recommendation,
        proposedChange: {
          type: 'pipe_specialization',
          payload: {
            pipeName: rec.pipeName,
            specialization: extractSpecialization(rec.recommendation),
          },
        },
        confidence: 0.8,
      })),
    });
  }
  
  if (tobaccoRecs.length > 0) {
    groups.push({
      groupTitle: `Tobacco Classifications (${tobaccoRecs.length})`,
      items: tobaccoRecs.map((rec, idx) => ({
        id: `tobacco-class-${idx}`,
        type: 'tobacco',
        itemName: rec.blendName,
        issue: 'Classification mismatch or unclear',
        recommendation: rec.recommendation,
        proposedChange: {
          type: 'tobacco_classification',
          payload: {
            blendName: rec.blendName,
            classification: extractClassification(rec.recommendation),
          },
        },
        confidence: 0.75,
      })),
    });
  }
  
  if (bottleRecs.length > 0) {
    groups.push({
      groupTitle: `Bottle Additions (${bottleRecs.length})`,
      items: bottleRecs.map((rec, idx) => ({
        id: `bottle-add-${idx}`,
        type: 'bottle',
        itemName: rec.suggestion,
        issue: 'Identified collection gap',
        recommendation: rec.reason,
        proposedChange: {
          type: 'bottle_addition_suggestion',
          payload: {
            suggestion: rec.suggestion,
            reason: rec.reason,
          },
        },
        confidence: 0.7,
      })),
    });
  }
  
  if (collectionIssues.length > 0) {
    groups.push({
      groupTitle: 'Collection Balance Issues',
      items: collectionIssues.map((issue, idx) => ({
        id: `collection-issue-${idx}`,
        type: 'collection',
        itemName: 'Collection Strategy',
        issue: issue,
        recommendation: 'Review and consider rebalancing',
        proposedChange: {
          type: 'collection_review',
          payload: { issue },
        },
        confidence: 0.65,
      })),
    });
  }
  
  return {
    actionId: 'optimize_collection',
    title: 'Collection Optimization',
    summary: `Found ${pipeRecs.length} pipe specializations, ${tobaccoRecs.length} tobacco classifications, and ${bottleRecs.length} acquisition opportunities`,
    groups,
  };
}

/**
 * Parse recommend_specializations action response
 */
export function parseSpecializationsResult(aiResponse, context = {}) {
  // Extract pipe specialization recommendations
  const groups = [];
  
  // Look for pattern: "Pipe Name → Specialization"
  const lines = (aiResponse || '').split('\n').filter(l => l.trim());
  const pipeSpecs = [];
  
  lines.forEach(line => {
    const match = line.match(/([^→:]+)(?:→|:)\s*(.+)/);
    if (match) {
      pipeSpecs.push({
        pipeName: match[1].trim(),
        specialization: match[2].trim(),
      });
    }
  });
  
  if (pipeSpecs.length > 0) {
    groups.push({
      groupTitle: `Pipe Specializations (${pipeSpecs.length})`,
      items: pipeSpecs.map((spec, idx) => ({
        id: `spec-${idx}`,
        type: 'pipe',
        itemName: spec.pipeName,
        issue: 'No specialization assigned',
        recommendation: `Assign to: ${spec.specialization}`,
        proposedChange: {
          type: 'pipe_specialization',
          payload: {
            pipeName: spec.pipeName,
            specialization: spec.specialization,
          },
        },
        confidence: 0.85,
      })),
    });
  }
  
  return {
    actionId: 'recommend_specializations',
    title: 'Pipe Specialization Strategy',
    summary: `Recommended specializations for ${pipeSpecs.length} pipes`,
    groups,
  };
}

/**
 * Parse reclassify_tobacco_blends action response
 */
export function parseTobaccoReclassificationResult(aiResponse, context = {}) {
  const groups = [];
  
  // Extract blend classification recommendations
  const lines = (aiResponse || '').split('\n').filter(l => l.trim());
  const blendReclassifications = [];
  
  lines.forEach(line => {
    const match = line.match(/([^→:]+)(?:→|:)\s*(.+)/);
    if (match) {
      blendReclassifications.push({
        blendName: match[1].trim(),
        newClassification: match[2].trim(),
      });
    }
  });
  
  if (blendReclassifications.length > 0) {
    groups.push({
      groupTitle: `Tobacco Reclassifications (${blendReclassifications.length})`,
      items: blendReclassifications.map((rec, idx) => ({
        id: `tobacco-reclassify-${idx}`,
        type: 'tobacco',
        itemName: rec.blendName,
        issue: 'Classification mismatch',
        recommendation: `Reclassify to: ${rec.newClassification}`,
        proposedChange: {
          type: 'tobacco_classification',
          payload: {
            blendName: rec.blendName,
            blendType: rec.newClassification,
          },
        },
        confidence: 0.8,
      })),
    });
  }
  
  return {
    actionId: 'reclassify_tobacco_blends',
    title: 'Tobacco Blend Normalization',
    summary: `Recommended ${blendReclassifications.length} tobacco reclassifications`,
    groups,
  };
}

/**
 * Helper: extract specialization from text
 */
function extractSpecialization(text) {
  // Try to extract specialization from text like "English blends" or "Latakia focused"
  const match = text.match(/(English|Latakia|Virginia|Light|Dark|Medium|Quick|Long session|Aromatic|Flake)[^,.]*/i);
  return match ? match[1] : 'General';
}

/**
 * Helper: extract classification from text
 */
function extractClassification(text) {
  // Try to extract blend type
  const types = [
    'English', 'Latakia Blend', 'Balkan', 'Virginia', 'Virginia/Perique',
    'Virginia/Burley', 'Burley', 'Aromatic', 'Oriental/Turkish', 'Navy Flake',
    'Cavendish', 'Dark Fired Kentucky', 'Perique'
  ];
  
  for (const type of types) {
    if (text.toLowerCase().includes(type.toLowerCase())) {
      return type;
    }
  }
  
  return 'Unknown';
}

/**
 * Main dispatcher: route action responses to appropriate parser
 */
export function parseActionResult(actionId, aiResponse, context = {}) {
  switch (actionId) {
    case 'optimize_collection':
      return parseOptimizeCollectionResult(aiResponse, context);
    case 'recommend_specializations':
      return parseSpecializationsResult(aiResponse, context);
    case 'reclassify_tobacco_blends':
      return parseTobaccoReclassificationResult(aiResponse, context);
    default:
      // Fallback: treat as freeform advice
      return {
        actionId,
        title: 'Expert Recommendation',
        summary: aiResponse.slice(0, 150),
        groups: [],
      };
  }
}