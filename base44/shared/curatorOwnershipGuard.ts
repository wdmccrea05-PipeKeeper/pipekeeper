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

export function sanitizeOwnershipClaims(responseText, verifiedSets) {
  if (!responseText || typeof responseText !== "string") return responseText;

  let sanitized = responseText;

  sanitized = sanitized.replace(
    /\bYour\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})/g,
    (match, itemName) => {
      if (isVerifiedOwned(itemName, verifiedSets)) return match;
      return `a ${itemName}`;
    }
  );

  sanitized = sanitized.replace(
    /\byour\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})/g,
    (match, itemName) => {
      if (isVerifiedOwned(itemName, verifiedSets)) return match;
      return `a ${itemName}`;
    }
  );

  sanitized = sanitized.replace(
    /\byou\s+have\s+(?:a|an)\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})/gi,
    (_match, itemName) => {
      if (isVerifiedOwned(itemName, verifiedSets)) return `you have a ${itemName}`;
      return `a ${itemName}`;
    }
  );

  sanitized = sanitized.replace(
    /\bthe\s+([A-Z0-9][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,4})\s+(you own|in your collection)\b/gi,
    (_match, itemName) => {
      if (isVerifiedOwned(itemName, verifiedSets)) return `the ${itemName} you own`;
      return `a ${itemName} worth considering`;
    }
  );

  return sanitized;
}

export function validateOwnershipIntegrity(responseText, pipes, blends) {
  const verifiedSets = buildVerifiedOwnedSets(pipes, blends);
  return sanitizeOwnershipClaims(responseText, verifiedSets);
}
