/**
 * CRITICAL HARDENING: Ownership claim guard for Curator responses.
 * 
 * Prevents Curator from falsely claiming user owns specific pipes/tobaccos
 * that are not in the verified collection.
 * 
 * Grounding prompts are not enough - this is a final safety layer.
 */

export function buildVerifiedOwnedSets(pipes = [], blends = []) {
  const pipeNames = new Set(
    pipes.map((p) => String(p?.name || "").trim().toLowerCase()).filter(Boolean)
  );
  
  const blendNames = new Set(
    blends.map((b) => String(b?.name || "").trim().toLowerCase()).filter(Boolean)
  );
  
  return { pipeNames, blendNames };
}

export function sanitizeOwnershipClaims(responseText, verifiedSets) {
  if (!responseText || typeof responseText !== 'string') return responseText;
  
  const { pipeNames, blendNames } = verifiedSets;
  
  // Patterns that indicate false ownership claims
  const ownershipPatterns = [
    /\byour\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:pipe|briar|estate)/gi,
    /\bthe\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:you\s+own|in\s+your\s+collection)/gi,
    /\byou\s+have\s+a\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:pipe|tobacco|blend)/gi,
  ];
  
  let sanitized = responseText;
  
  for (const pattern of ownershipPatterns) {
    sanitized = sanitized.replace(pattern, (match, itemName) => {
      const normalized = String(itemName).trim().toLowerCase();
      
      // If verified in collection, allow the claim
      if (pipeNames.has(normalized) || blendNames.has(normalized)) {
        return match;
      }
      
      // Otherwise, reframe as suggestion
      return match.replace(/\byour\b/gi, 'a').replace(/\byou\s+own\b/gi, 'worth considering');
    });
  }
  
  return sanitized;
}

export function validateOwnershipIntegrity(responseText, pipes, blends) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}