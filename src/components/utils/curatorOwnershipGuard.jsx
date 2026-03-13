/**
 * Ownership claim guard for Curator responses.
 *
 * Prevents Curator from falsely claiming the user owns specific
 * pipes or blends that are not in the verified collection set.
 */

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[“”"'.:,;!?()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function buildVerifiedOwnedSets(pipes = [], blends = []) {
  const pipeNames = new Set(
    pipes.map((p) => normalizeName(p?.name)).filter(Boolean)
  );

  const blendNames = new Set(
    blends.map((b) => normalizeName(b?.name)).filter(Boolean)
  );

  return { pipeNames, blendNames };
}

function isVerifiedOwned(itemName, verifiedSets) {
  const normalized = normalizeName(itemName);
  if (!normalized) return false;

  return (
    verifiedSets.pipeNames.has(normalized) ||
    verifiedSets.blendNames.has(normalized)
  );
}

export function sanitizeOwnershipClaims(responseText, verifiedSets) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  const ownershipPatterns = [
    {
      // "Your Peterson System..."
      regex: /\b(your)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\b/g,
      replace: (_match, pronoun, itemName) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${pronoun} ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      // "You have a McClelland 5100..."
      regex: /\b(you\s+have\s+(?:a|an))\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\b/g,
      replace: (_match, _lead, itemName) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `you have a ${itemName}`;
        return `a ${itemName}`;
      },
    },
    {
      // "The Dunhill you own..."
      regex: /\b(the)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you\s+own|in\s+your\s+collection)\b/g,
      replace: (_match, article, itemName, tail) => {
        if (isVerifiedOwned(itemName, verifiedSets)) return `${article} ${itemName} ${tail}`;
        return `a ${itemName} worth considering`;
      },
    },
  ];

  for (const pattern of ownershipPatterns) {
    sanitized = sanitized.replace(pattern.regex, pattern.replace);
  }

  return sanitized;
}

export function validateOwnershipIntegrity(responseText, pipes, blends) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
