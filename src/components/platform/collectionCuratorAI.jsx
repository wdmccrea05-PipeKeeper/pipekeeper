/**
 * collectionCuratorAI.jsx
 * 
 * Collection Curator AI utilities and configuration.
 */

/**
 * Get active optimization scopes for the collection curator
 * @returns {Array} - Array of scope definitions
 */
export function getActiveOptimizeScopes() {
  return [
    {
      id: "pipe_tobacco_pairings",
      label: "Pipe & Tobacco Pairings",
      description: "Optimize how pipes pair with tobacco blends",
    },
  ];
}

/**
 * Generate contextual prompt for curator interaction
 * @param {Object} params
 * @param {string} params.type - Type of prompt (insight, optimization, etc)
 * @param {Object} params.context - Context data
 * @returns {string} - Generated prompt
 */
export function generateCuratorPrompt({ type, context }) {
  if (!type || !context) return "";
  
  switch (type) {
    case "insight":
      return `${context.title || ""}. ${context.summary || ""}`;
    
    case "optimization":
      return context.rationale || context.prompt || "";
    
    case "whatif":
      return context.whatif_prompt || "";
    
    default:
      return "";
  }
}