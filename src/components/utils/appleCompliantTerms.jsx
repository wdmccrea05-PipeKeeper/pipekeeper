/**
 * Apple-compliant terminology mapper
 * Replaces policy-sensitive terms with approved alternatives
 */

export const TERM_MAPPING = {
  // Verb forms
  "smoking": "usage",
  "smoke": "use",
  "smoked": "used",
  "smokes": "uses",
  
  // Noun forms
  "smoker": "collector",
  "smokers": "collectors",
  "smoking session": "session",
  "smoking sessions": "sessions",
  "smoking log": "usage log",
  "smoking history": "usage history",
  "smoking pattern": "usage pattern",
  "smoking patterns": "usage patterns",
  "smoking frequency": "usage frequency",
  "smoking characteristics": "usage characteristics",
  
  // Activity descriptions
  "smoke this pipe": "use this pipe",
  "smoke duration": "session duration",
  "smoke a bowl": "use this pipe",
  "bowls smoked": "bowls used",
  
  // Contextual replacements
  "for smoking": "for use",
  "while smoking": "during use",
  "when smoking": "when using",
  "after smoking": "after use",
  "before smoking": "before use"
};

/**
 * Replace sensitive terms in a string
 */
export function appleCompliantText(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  Object.entries(TERM_MAPPING).forEach(([original, replacement]) => {
    // Case-insensitive replacement
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve original casing pattern
      if (match === match.toUpperCase()) return replacement.toUpperCase();
      if (match[0] === match[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  });
  
  return result;
}

/**
 * Check if text contains non-compliant terms
 */
export function hasNonCompliantTerms(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  return Object.keys(TERM_MAPPING).some(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(lowerText);
  });
}