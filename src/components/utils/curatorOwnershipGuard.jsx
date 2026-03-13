function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[“”"'.:,;!?()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function buildVerifiedOwnedSets(pipes = [], blends = []) {
  return {
    pipeNames: new Set(pipes.map((p) => normalizeName(p?.name)).filter(Boolean)),
    blendNames: new Set(blends.map((b) => normalizeName(b?.name)).filter(Boolean)),
  };
}

function isVerifiedOwned(itemName, verifiedSets) {
  const normalized = normalizeName(itemName);
  return (
    verifiedSets?.pipeNames?.has(normalized) ||
    verifiedSets?.blendNames?.has(normalized)
  );
}

function replaceVerifiedOrGeneric(prefix, itemName, verifiedSets, verifiedFormatter, unverifiedFormatter) {
  if (isVerifiedOwned(itemName, verifiedSets)) {
    return verifiedFormatter(prefix, itemName);
  }
  return unverifiedFormatter(prefix, itemName);
}

export function sanitizeOwnershipClaims(responseText, verifiedSets) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  // Pattern 1:
  // "Your Peterson Sherlock Holmes ..."
  // "your Nightcap ..."
  // Stops before common sentence continuations.
  sanitized = sanitized.replace(
    /\b(your)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/g,
    (_match, prefix, itemName) =>
      replaceVerifiedOrGeneric(
        prefix,
        itemName,
        verifiedSets,
        (p, name) => `${p} ${name}`,
        (_p, name) => `a ${name}`
      )
  );

  // Pattern 2:
  // "You have a McClelland 5100 ..."
  sanitized = sanitized.replace(
    /\b(you\s+have\s+(?:a|an))\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})(?=\s+(?:is|are|was|were|would|could|should|can|may|might|pairs|pair|works|work|benefits|benefit|with|for|in|on|at|and|but|,|\.))/gi,
    (_match, prefix, itemName) =>
      replaceVerifiedOrGeneric(
        prefix,
        itemName,
        verifiedSets,
        (p, name) => `${p} ${name}`,
        (_p, name) => `a ${name}`
      )
  );

  // Pattern 3:
  // "The Dunhill you own"
  sanitized = sanitized.replace(
    /\b(the)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you\s+own|in\s+your\s+collection)\b/gi,
    (_match, article, itemName, tail) =>
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

export function validateOwnershipIntegrity(responseText, pipes, blends) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
