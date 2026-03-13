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

function replaceVerifiedOrGeneric(
  prefix: string,
  itemName: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> },
  verifiedFormatter: (prefix: string, itemName: string) => string,
  unverifiedFormatter: (prefix: string, itemName: string) => string
): string {
  if (isVerifiedOwned(itemName, verifiedSets)) {
    return verifiedFormatter(prefix, itemName);
  }
  return unverifiedFormatter(prefix, itemName);
}

export function sanitizeOwnershipClaims(
  responseText: string,
  verifiedSets: { pipeNames: Set<string>; blendNames: Set<string> }
) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  sanitized = sanitized.replace(
    /\b(your)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/g,
    (_match: string, prefix: string, itemName: string) =>
      replaceVerifiedOrGeneric(
        prefix,
        itemName,
        verifiedSets,
        (p, name) => `${p} ${name}`,
        (_p, name) => `a ${name}`
      )
  );

  sanitized = sanitized.replace(
    /\b(you\s+have\s+(?:a|an))\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/gi,
    (_match: string, prefix: string, itemName: string) =>
      replaceVerifiedOrGeneric(
        prefix,
        itemName,
        verifiedSets,
        (p, name) => `${p} ${name}`,
        (_p, name) => `a ${name}`
      )
  );

  sanitized = sanitized.replace(
    /\b(the)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you\s+own|in\s+your\s+collection)\b/gi,
    (_match: string, article: string, itemName: string, tail: string) =>
      replaceVerifiedOrGeneric(
        itemName,
        itemName,
        verifiedSets,
        () => `${article} ${itemName} ${tail}`,
        () => `a ${itemName} worth considering`
      )
  );

  return sanitized;
}

export function validateOwnershipIntegrity(responseText: string, pipes: any[], blends: any[]) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
