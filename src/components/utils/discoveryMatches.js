export function sanitizeAiDiscoveryMatches(rawMatches) {
  return (rawMatches || []).map((match) => ({
    manufacturer: match?.manufacturer || '',
    blend_name: match?.blend_name || '',
    reasoning: match?.reasoning || '',
    estimatedSuitability: match?.estimated_suitability || 'promising',
    confidence: match?.metadata_confidence || 'insufficient metadata',
    canonicalScore: null,
  }));
}
