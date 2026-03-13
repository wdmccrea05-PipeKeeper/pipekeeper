function normalizeName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[“”"'.:,;!?()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function buildVerifiedOwnedSets(pipes: any[] = [], blends: any[] = []) {
  return {
    pipeNames: new Set(pipes.map((p) => normalizeName(p?.name)).filter(Boolean)),
    blendNames: new Set(blends.map((b) => normalizeName(b?.name)).filter(Boolean)),
  };
}

function isVerifiedOwned(
  itemName: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> }
): boolean {
  const normalized = normalizeName(itemName);
  return (
    verifiedSets?.pipeNames?.has(normalized) ||
    verifiedSets?.blendNames?.has(normalized)
  );
}

export function sanitizeOwnershipClaims(
  responseText: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> }
) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  const patterns = [
    {
      regex:
        /\b(your)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/g,
      replace: (_match: string, pronoun: string, itemName: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${pronoun} ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      regex:
        /\b(you\s+have\s+(?:a|an))\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/gi,
      replace: (_match: string, prefix: string, itemName: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${prefix} ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      regex:
        /\b(the)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you\s+own|in\s+your\s+collection)\b/gi,
      replace: (_match: string, article: string, itemName: string, tail: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${article} ${itemName} ${tail}`;
        return `a ${itemName} worth considering`;
      },
    },
  ];

  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern.regex, pattern.replace as any);
  }

  return sanitized;
}

export function validateOwnershipIntegrity(responseText: string, pipes: any[], blends: any[]) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
