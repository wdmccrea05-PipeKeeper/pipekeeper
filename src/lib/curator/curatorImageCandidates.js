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

function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

function getIdentityRules(recordType = '') {
  switch (recordType) {
    case 'blend':
    case 'tobacco':
      return {
        required: [['manufacturer', 'brand'], ['name', 'blend_name']],
        optionalBoost: ['blend_type', 'strength', 'cut'],
        mismatchChecks: [['manufacturer', 'brand'], ['name', 'blend_name']],
      };
    case 'cigar':
      return {
        required: [['brand'], ['line']],
        optionalBoost: ['vitola', 'wrapper', 'binder', 'filler'],
        mismatchChecks: [['brand'], ['line']],
      };
    case 'wine':
      return {
        required: [['producer'], ['name', 'wine_name']],
        optionalBoost: ['vintage', 'region', 'appellation'],
        mismatchChecks: [['producer'], ['name', 'wine_name']],
      };
    case 'bottle':
    case 'whiskey':
      return {
        required: [['distillery', 'brand'], ['expression', 'name']],
        optionalBoost: ['age', 'proof', 'finish', 'batch'],
        mismatchChecks: [['distillery', 'brand'], ['expression', 'name']],
      };
    case 'pipe':
      return {
        required: [['maker'], ['model', 'shape', 'stamping', 'name']],
        optionalBoost: ['shape', 'stamping'],
        mismatchChecks: [['maker'], ['model', 'shape', 'stamping', 'name']],
      };
    default:
      return { required: [], optionalBoost: [], mismatchChecks: [] };
  }
}

function pickIdentityValue(source = {}, aliases = []) {
  return aliases.map((key) => source?.[key]).find((value) => hasValue(value)) || null;
}

function hasGroupValues(source = {}, aliases = []) {
  return hasValue(pickIdentityValue(source, aliases));
}

function isVintageNeutral(candidate = {}) {
  return candidate?.vintageNeutral === true || candidate?.vintage_neutral === true || /vintage[-_\s]?neutral/i.test(String(candidate?.matchReason || ''));
}

function hasIdentityMismatch(record = {}, candidate = {}, recordType = '') {
  switch (recordType) {
    case 'blend':
    case 'tobacco':
      if ((candidate.manufacturer || candidate.brand) && !exact(record.manufacturer || record.brand, candidate.manufacturer || candidate.brand)) return true;
      if ((candidate.name || candidate.blend_name) && !exact(record.name, candidate.name || candidate.blend_name)) return true;
      return false;
    case 'cigar':
      if (candidate.brand && !exact(record.brand, candidate.brand)) return true;
      if (candidate.line && !exact(record.line, candidate.line)) return true;
      return false;
    case 'wine':
      if (candidate.producer && !exact(record.producer, candidate.producer)) return true;
      if ((candidate.name || candidate.wine_name) && !exact(record.name, candidate.name || candidate.wine_name)) return true;
      if (hasValue(record.vintage) && hasValue(candidate.vintage) && !exact(record.vintage, candidate.vintage) && !isVintageNeutral(candidate)) return true;
      return false;
    case 'bottle':
    case 'whiskey':
      if ((candidate.distillery || candidate.brand) && !exact(record.distillery || record.brand, candidate.distillery || candidate.brand)) return true;
      if ((candidate.expression || candidate.name) && !exact(record.expression || record.name, candidate.expression || candidate.name)) return true;
      return false;
    case 'pipe':
      if (candidate.maker && !exact(record.maker, candidate.maker)) return true;
      return false;
    default:
      return false;
  }
}

function validateIdentityCoverage(record = {}, candidate = {}, recordType = '', source = '') {
  const rules = getIdentityRules(recordType);
  const requiredGroups = rules.required || [];
  const requiredMatches = requiredGroups.filter((aliases) => hasGroupValues(candidate, aliases));
  const requiredCount = requiredMatches.length;
  const optionalMatched = (rules.optionalBoost || []).filter((field) => hasValue(candidate?.[field]));
  const isInternalSource = ['app_library', 'verified_asset', 'online'].includes(source);

  const mismatch = hasIdentityMismatch(record, candidate, recordType);
  if (mismatch) {
    return {
      valid: false,
      referenceOnly: false,
      confidenceCap: 0,
      warnings: ['Candidate identity conflicts with this record and was excluded.'],
    };
  }

  if (!isInternalSource) {
    return {
      valid: true,
      referenceOnly: false,
      confidenceCap: 1,
      warnings: [],
    };
  }

  if (requiredCount < requiredGroups.length) {
    return {
      valid: true,
      referenceOnly: true,
      confidenceCap: 0.55,
      warnings: ['Identity metadata is incomplete; candidate is reference-only until exact identity is proven.'],
    };
  }

  return {
    valid: true,
    referenceOnly: false,
    confidenceCap: optionalMatched.length > 0 ? 1 : 0.89,
    warnings: [],
  };
}

export function validateCuratorImageCandidateForRecord({
  record = {},
  candidate = {},
  recordType: explicitRecordType = '',
} = {}) {
  const recordType = String(explicitRecordType || record?.recordType || record?.type || '').toLowerCase();
  const source = normalizeSource(candidate?.source);
  return validateIdentityCoverage(record, candidate, recordType, source);
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
    resolvedBy: 'resolveCuratorImageCandidates',
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
    const {
      imageUrl: _imageUrl,
      confidence: _confidence,
      matchReason: _matchReason,
      matchedFields: _matchedFields,
      warnings: _warnings,
      requiresReview: _requiresReview,
      source: _source,
      ...identityMeta
    } = entry || {};
    candidates.push(buildCandidate({
      imageUrl: entry.imageUrl,
      source: 'app_library',
      confidence: clampConfidence(entry.confidence, 0.9),
      matchReason: entry.matchReason || 'Matched from the internal app image library.',
      matchedFields: entry.matchedFields || matchedFields,
      warnings: entry.warnings || [],
      ...identityMeta,
    }));
  });

  verifiedImageAssets.forEach((entry) => {
    if (!entry?.imageUrl) return;
    const {
      imageUrl: _imageUrl,
      confidence: _confidence,
      matchReason: _matchReason,
      matchedFields: _matchedFields,
      warnings: _warnings,
      requiresReview: _requiresReview,
      source: _source,
      ...identityMeta
    } = entry || {};
    candidates.push(buildCandidate({
      imageUrl: entry.imageUrl,
      source: 'verified_asset',
      confidence: clampConfidence(entry.confidence, 0.86),
      matchReason: entry.matchReason || 'Matched from a previously verified asset.',
      matchedFields: entry.matchedFields || matchedFields,
      warnings: entry.warnings || [],
      ...identityMeta,
    }));
  });

  onlineCandidates.forEach((entry) => {
    const source = normalizeSource(entry?.source);
    const {
      imageUrl: _imageUrl,
      confidence: _confidence,
      matchReason: _matchReason,
      matchedFields: _matchedFields,
      warnings: _warnings,
      requiresReview: _requiresReview,
      source: _source,
      ...identityMeta
    } = entry || {};
    candidates.push(buildCandidate({
      imageUrl: entry?.imageUrl,
      source,
      confidence: clampConfidence(entry?.confidence, 0.6),
      matchReason: entry?.matchReason || 'Online candidate requires review before applying.',
      matchedFields: entry?.matchedFields || matchedFields,
      warnings: entry?.warnings || ['Online images are suggestions until approved.'],
      ...identityMeta,
      requiresReview: true,
    }));
  });

  return candidates
    .filter((candidate) => candidate.imageUrl)
    .map((candidate) => {
      const validation = validateIdentityCoverage(record, candidate, recordType, candidate.source);
      if (!validation.valid) return null;

      const warnings = [...(candidate.warnings || []), ...(validation.warnings || [])];
      const confidence = Math.min(Number(candidate.confidence || 0), validation.confidenceCap ?? 1);
      const referenceOnly = validation.referenceOnly === true;

      return {
        ...candidate,
        confidence,
        warnings,
        requiresReview: candidate.requiresReview || referenceOnly,
        referenceOnly,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const sourceDelta = (IMAGE_SOURCE_PRIORITY[a.source] || 99) - (IMAGE_SOURCE_PRIORITY[b.source] || 99);
      if (sourceDelta !== 0) return sourceDelta;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    });
}

export { IMAGE_SOURCE_PRIORITY };
