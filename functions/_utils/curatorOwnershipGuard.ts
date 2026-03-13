/**
 * Ownership claim guard for Curator responses.
 *
 * Prevents Curator from falsely claiming the user owns specific
 * pipes or blends that are not in the verified collection set.
 */

function normalizeName(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[“”"'.:,;!?()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function buildVerifiedOwnedSets(pipes: any[] = [], blends: any[] = []) {
  const pipeNames = new Set(
    pipes.map((p) => normalizeName(p?.name)).filter(Boolean)
  );

  const blendNames = new Set(
    blends.map((b) => normalizeName(b?.name)).filter(Boolean)
  );

  return { pipeNames, blendNames };
}

function isVerifiedOwned(
  itemName: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> }
): boolean {
  const normalized = normalizeName(itemName);
  if (!normalized) return false;

  return (
    verifiedSets.pipeNames.has(normalized) ||
    verifiedSets.blendNames.has(normalized)
  );
}

export function sanitizeOwnershipClaims(
  responseText: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> }
) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  const ownershipPatterns = [
    {
      regex: /\b(your)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\b/g,
      replace: (_match: string, pronoun: string, itemName: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${pronoun} ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      regex: /\b(you\s+have\s+(?:a|an))\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\b/g,
      replace: (_match: string, _lead: string, itemName: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `you have a ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      regex: /\b(the)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you\s+own|in\s+your\s+collection)\b/g,
      replace: (_match: string, article: string, itemName: string, tail: string) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${article} ${itemName} ${tail}`;
        return `a ${itemName} worth considering`;
      },
    },
  ];

  for (const pattern of ownershipPatterns) {
    sanitized = sanitized.replace(pattern.regex, pattern.replace as any);
  }

  return sanitized;
}

export function validateOwnershipIntegrity(responseText: string, pipes: any[], blends: any[]) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
