const IMAGE_SOURCE_PRIORITY = {
  user_attached: 1,
  user_similar: 2,
  app_library: 3,
  verified_asset: 4,
  online: 5,
};

const IMAGE_FIELD_KEYS = ['photo', 'image', 'image_url', 'photo_url', 'primary_photo', 'photos'];

function clampConfidence(value, fallback = 0.6) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

function extractImages(record = {}) {
  return IMAGE_FIELD_KEYS.flatMap((key) => normalizeList(record?.[key]));
}

function normalizeSource(source = '') {
  const raw = String(source || '').toLowerCase();
  if (raw.includes('user') && raw.includes('attach')) return 'user_attached';
  if (raw.includes('user')) return 'user_similar';
  if (raw.includes('verified')) return 'verified_asset';
  if (raw.includes('library') || raw.includes('internal')) return 'app_library';
  return 'online';
}

function exact(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function hasIdentityMismatch(record = {}, candidate = {}, recordType = '') {
  switch (recordType) {
    case 'blend':
    case 'tobacco':
      if ((record.manufacturer || candidate.manufacturer) && !exact(record.manufacturer || record.brand, candidate.manufacturer || candidate.brand)) return true;
      if ((record.name || candidate.name) && !exact(record.name, candidate.name || candidate.blend_name)) return true;
      return false;
    case 'cigar':
      if ((record.brand || candidate.brand) && !exact(record.brand, candidate.brand)) return true;
      if ((record.line || candidate.line) && !exact(record.line, candidate.line)) return true;
      return false;
    case 'wine':
      if ((record.producer || candidate.producer) && !exact(record.producer, candidate.producer)) return true;
      if ((record.name || candidate.name) && !exact(record.name, candidate.name || candidate.wine_name)) return true;
      return false;
    case 'bottle':
    case 'whiskey':
      if ((record.distillery || record.brand || candidate.distillery || candidate.brand) && !exact(record.distillery || record.brand, candidate.distillery || candidate.brand)) return true;
      if ((record.expression || record.name || candidate.expression || candidate.name) && !exact(record.expression || record.name, candidate.expression || candidate.name)) return true;
      return false;
    case 'pipe':
      if ((record.maker || candidate.maker) && !exact(record.maker, candidate.maker)) return true;
      return false;
    default:
      return false;
  }
}

function buildCandidate({
  imageUrl,
  source,
  confidence,
  matchReason,
  matchedFields = [],
  warnings = [],
  requiresReview = true,
  ...identity
}) {
  return {
    imageUrl,
    source,
    confidence,
    matchReason,
    matchedFields,
    warnings,
    requiresReview,
    ...identity,
  };
}

export function resolveCuratorImageCandidates({
  record = {},
  similarRecords = [],
  appImageLibrary = [],
  verifiedImageAssets = [],
  onlineCandidates = [],
} = {}) {
  const candidates = [];
  const recordType = String(record?.recordType || record?.type || '').toLowerCase();
  const name = record?.name || record?.recordName || 'this record';
  const matchedFields = [
    record?.manufacturer && 'manufacturer',
    record?.brand && 'brand',
    record?.distillery && 'distillery',
    record?.producer && 'producer',
    record?.line && 'line',
    record?.expression && 'expression',
    record?.blend_name && 'blend_name',
  ].filter(Boolean);

  extractImages(record).forEach((imageUrl) => {
    candidates.push(buildCandidate({
      imageUrl,
      source: 'user_attached',
      confidence: 1,
      matchReason: `Existing user-uploaded image already attached to ${name}.`,
      matchedFields,
      warnings: [],
      requiresReview: false,
    }));
  });

  similarRecords.forEach((similar) => {
    extractImages(similar).forEach((imageUrl) => {
      candidates.push(buildCandidate({
        imageUrl,
        source: 'user_similar',
        confidence: 0.92,
        matchReason: `Previously uploaded image found on a similar ${recordType || 'collection'} record.`,
        matchedFields,
        warnings: ['Verify that the product identity is exact before replacing the current image.'],
        ...similar,
      }));
    });
  });

  appImageLibrary.forEach((entry) => {
    if (!entry?.imageUrl) return;
    candidates.push(buildCandidate({
      imageUrl: entry.imageUrl,
      source: 'app_library',
      confidence: clampConfidence(entry.confidence, 0.9),
      matchReason: entry.matchReason || 'Matched from the internal app image library.',
      matchedFields: entry.matchedFields || matchedFields,
      warnings: entry.warnings || [],
      ...entry,
    }));
  });

  verifiedImageAssets.forEach((entry) => {
    if (!entry?.imageUrl) return;
    candidates.push(buildCandidate({
      imageUrl: entry.imageUrl,
      source: 'verified_asset',
      confidence: clampConfidence(entry.confidence, 0.86),
      matchReason: entry.matchReason || 'Matched from a previously verified asset.',
      matchedFields: entry.matchedFields || matchedFields,
      warnings: entry.warnings || [],
      ...entry,
    }));
  });

  onlineCandidates.forEach((entry) => {
    const source = normalizeSource(entry?.source);
    candidates.push(buildCandidate({
      imageUrl: entry?.imageUrl,
      source,
      confidence: clampConfidence(entry?.confidence, 0.6),
      matchReason: entry?.matchReason || 'Online candidate requires review before applying.',
      matchedFields: entry?.matchedFields || matchedFields,
      warnings: entry?.warnings || ['Online images are suggestions until approved.'],
      requiresReview: true,
      ...entry,
    }));
  });

  return candidates
    .filter((candidate) => candidate.imageUrl)
    .filter((candidate) => !hasIdentityMismatch(record, candidate, recordType))
    .sort((a, b) => {
      const sourceDelta = (IMAGE_SOURCE_PRIORITY[a.source] || 99) - (IMAGE_SOURCE_PRIORITY[b.source] || 99);
      if (sourceDelta !== 0) return sourceDelta;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    });
}

export { IMAGE_SOURCE_PRIORITY };
