import { buildCuratorContextWithLogging } from './buildCuratorContext.js';
import { runCuratorEngines } from './engineRouter.js';
import { groupRecommendations } from './recommendationGrouping.js';
import { CURATOR_AUTO_APPLY_POLICY, getCuratorAutoApplyDisposition } from './autoApplyPolicy.js';
import { resolveCuratorImageCandidates } from './curatorImageCandidates.js';

function extractImages(record = {}) {
  return [
    record?.photo,
    record?.image,
    record?.image_url,
    record?.photo_url,
    record?.primary_photo,
    ...(Array.isArray(record?.photos) ? record.photos : []),
  ].filter(Boolean);
}

function sumValues(rows = [], keys = []) {
  return rows.reduce(
    (sum, row) => sum + keys.reduce((inner, key) => inner + Number(row?.[key] || 0), 0),
    0
  );
}

function countMissingImageRecords(rows = []) {
  return rows.filter((row) => extractImages(row).length === 0).length;
}

function countMissingFields(rows = [], fields = []) {
  return rows.reduce(
    (sum, row) => sum + fields.filter((field) => row?.[field] == null || row?.[field] === '').length,
    0
  );
}

function buildImageIndex(rows = [], source) {
  return rows.flatMap((row) =>
    extractImages(row).map((imageUrl) => ({
      imageUrl,
      source,
      recordId: row.id || null,
      recordName: row.name || row.recordName || null,
    }))
  );
}

function buildDiagnostics(context = {}) {
  return {
    buildStatus: context._buildStatus || 'success',
    counts: {
      pipes: context.pipes?.length || 0,
      tobaccoBlends: context.blends?.length || 0,
      bottles: context.bottles?.length || 0,
      cigars: context.cigars?.length || 0,
      wines: context.wines?.length || 0,
      pairings: context.pairingMatrixPairings?.length || 0,
      acquisitionItems: context.acquisitionItems?.length || 0,
    },
  };
}

export async function buildCuratorDataSnapshot({
  user,
  buildContextFn,
  stableModuleEnabled = {},
  appImageLibrary = [],
  verifiedImageAssets = [],
} = {}) {
  const context = await buildCuratorContextWithLogging(user, buildContextFn, stableModuleEnabled);

  const pipeImages = buildImageIndex(context.pipes || [], 'user_attached');
  const blendImages = buildImageIndex(context.blends || [], 'user_attached');
  const bottleImages = buildImageIndex(context.bottles || [], 'user_attached');
  const cigarImages = buildImageIndex(context.cigars || [], 'user_attached');
  const wineImages = buildImageIndex(context.wines || [], 'user_attached');

  const snapshot = {
    activeModules: context.activeModules || stableModuleEnabled,
    pipekeeper: {
      pipes: context.pipes || [],
      tobaccoBlends: context.blends || [],
      smokingLogs: context.smokingLogs || [],
      pairingMatrix: context.pairingMatrixPairings || [],
      pipeSpecializations: (context.pipes || []).map((pipe) => ({
        pipeId: pipe.id,
        specialization: pipe.specialization || pipe.focus || null,
      })),
      inventory: context.blends || [],
      images: [...pipeImages, ...blendImages],
    },
    whiskeykeeper: {
      bottles: context.bottles || [],
      inventoryUnits: context.inventoryUnits || [],
      tastingLogs: context.tastingLogs || [],
      valuationData: (context.bottles || []).map((bottle) => ({
        recordId: bottle.id,
        estimated_value: bottle.estimated_value || bottle.collector_value || bottle.retail_price || 0,
      })),
      images: bottleImages,
    },
    cigarkeeper: {
      cigars: context.cigars || [],
      sessions: context.cigarSessions || [],
      inventory: context.cigars || [],
      valuationData: (context.cigars || []).map((cigar) => ({
        recordId: cigar.id,
        estimated_value: cigar.estimated_value || cigar.purchase_price || 0,
      })),
      images: cigarImages,
    },
    winekeeper: {
      wines: context.wines || [],
      tastingLogs: context.wineTastingLogs || [],
      inventory: context.wines || [],
      valuationData: (context.wines || []).map((wine) => ({
        recordId: wine.id,
        estimated_value: wine.estimated_value || wine.purchase_price || 0,
      })),
      images: wineImages,
    },
    acquisitionItems: context.acquisitionItems || [],
    userPreferences: context.preferences || {},
    appImageLibrary,
    userUploadedImages: [...pipeImages, ...blendImages, ...bottleImages, ...cigarImages, ...wineImages],
    diagnostics: buildDiagnostics(context),
    dataQuality: {
      missingImages:
        countMissingImageRecords(context.pipes || []) +
        countMissingImageRecords(context.blends || []) +
        countMissingImageRecords(context.bottles || []) +
        countMissingImageRecords(context.cigars || []) +
        countMissingImageRecords(context.wines || []),
      missingCoreMetadata:
        countMissingFields(context.bottles || [], ['abv', 'region', 'country']) +
        countMissingFields(context.wines || [], ['vintage', 'region', 'country']) +
        countMissingFields(context.blends || [], ['blend_type', 'strength']),
    },
    valuationSummaries: {
      whiskey: sumValues(context.bottles || [], ['estimated_value', 'collector_value', 'retail_price']),
      cigar: sumValues(context.cigars || [], ['estimated_value', 'purchase_price']),
      wine: sumValues(context.wines || [], ['estimated_value', 'purchase_price']),
    },
    _context: context,
    _verifiedImageAssets: verifiedImageAssets,
  };

  return snapshot;
}

function pickOperationFindings(routerResults = {}, operationType = 'workspace') {
  const key = String(operationType || 'workspace').toLowerCase();
  switch (key) {
    case 'recordoptimization':
    case 'record_optimization':
      return routerResults.recordOptimization || [];
    case 'collectionoptimization':
    case 'collection_optimization':
      return routerResults.collectionOptimization || [];
    case 'purchaserestock':
    case 'purchase_restock':
    case 'purchase':
      return routerResults.purchaseRestock || [];
    case 'pairings':
      return routerResults.pairings || [];
    case 'growexpand':
    case 'grow_expand':
      return routerResults.growExpand || [];
    case 'plansession':
    case 'plan_session':
      return routerResults.planSession || [];
    default:
      return [
        ...(routerResults.recordOptimization || []),
        ...(routerResults.collectionOptimization || []),
        ...(routerResults.purchaseRestock || []),
        ...(routerResults.growExpand || []),
      ];
  }
}

function filterFindings(findings = [], { selectedRecordId, selectedRecordType } = {}) {
  if (!selectedRecordId && !selectedRecordType) return findings;

  return findings.filter((finding) => {
    const items = Array.isArray(finding?.items) ? finding.items : [];
    return items.some((item) => {
      const matchesId = selectedRecordId ? (item.recordId || item.id) === selectedRecordId : true;
      const matchesType = selectedRecordType ? String(item.recordType || '').toLowerCase() === String(selectedRecordType).toLowerCase() : true;
      return matchesId && matchesType;
    });
  });
}

function summarizeEvidence(findings = [], snapshot = {}) {
  return findings.map((finding) => ({
    recommendationId: finding.id,
    category: finding.category,
    goal: finding.goal,
    actionType: finding.actionType,
    moduleKey: finding.moduleKey,
    itemCount: Array.isArray(finding.items) ? finding.items.length : 0,
    dataOrigin: 'internal',
    imageCandidates:
      Array.isArray(finding.items) && finding.items.length === 1
        ? resolveCuratorImageCandidates({
            record: finding.items[0],
            appImageLibrary: snapshot.appImageLibrary,
            verifiedImageAssets: snapshot._verifiedImageAssets,
          }).slice(0, 3)
        : [],
  }));
}

function buildStatus({ findings = [], reviewItems = [], appliedChanges = [] } = {}) {
  if (appliedChanges.length > 0) return 'applied';
  if (reviewItems.length > 0) return 'review_required';
  if (findings.length > 0) return 'ready';
  return 'idle';
}

export async function runCuratorOperation(operationInput = {}, snapshot = {}) {
  const {
    operationType = 'workspace',
    selectedRecordId = null,
    selectedRecordType = null,
    autoApplyPolicy = CURATOR_AUTO_APPLY_POLICY,
    applyRecommendation = null,
    autoApplyRuntime = 'dry_run',
  } = operationInput;

  const routerResults = operationInput.routerResults || runCuratorEngines(snapshot._context || {});
  const findings = filterFindings(
    pickOperationFindings(routerResults, operationType),
    { selectedRecordId, selectedRecordType }
  );

  const reviewItems = [];
  const skippedItems = [];
  const autoApplicable = [];

  findings.forEach((finding) => {
    const disposition = getCuratorAutoApplyDisposition(finding, autoApplyPolicy);
    if (disposition.autoApply) {
      autoApplicable.push(finding);
      return;
    }
    if (disposition.reviewRequired) {
      reviewItems.push(finding);
      return;
    }
    skippedItems.push(finding);
  });

  const appliedChanges = [];
  if (autoApplyRuntime === 'apply' && typeof applyRecommendation === 'function') {
    for (const finding of autoApplicable) {
      // eslint-disable-next-line no-await-in-loop
      const result = await applyRecommendation(finding);
      appliedChanges.push({
        recommendationId: finding.id,
        result,
      });
    }
  }

  return {
    status: buildStatus({ findings, reviewItems, appliedChanges }),
    findings,
    appliedChanges,
    reviewRequired: reviewItems.length > 0,
    reviewItems,
    skippedItems,
    errors: [],
    confidence: autoApplicable.length > 0 ? 'high' : reviewItems.length > 0 ? 'medium' : 'low',
    evidence: summarizeEvidence(findings, snapshot),
    explanation:
      findings.length > 0
        ? `${findings.length} structured curator finding${findings.length === 1 ? '' : 's'} ready. ${autoApplicable.length} auto-applicable, ${reviewItems.length} require review.`
        : 'No matching curator findings are available for this operation.',
  };
}

export async function runCuratorWorkspaceOperations(snapshot = {}) {
  const routerResults = runCuratorEngines(snapshot._context || {});
  const sections = groupRecommendations([
    ...(routerResults.recordOptimization || []),
    ...(routerResults.collectionOptimization || []),
    ...(routerResults.purchaseRestock || []),
    ...(routerResults.growExpand || []),
  ]);

  const [recordOptimization, collectionOptimization, purchaseRestock, growExpand, pairings] = await Promise.all([
    runCuratorOperation({ operationType: 'record_optimization', routerResults }, snapshot),
    runCuratorOperation({ operationType: 'collection_optimization', routerResults }, snapshot),
    runCuratorOperation({ operationType: 'purchase_restock', routerResults }, snapshot),
    runCuratorOperation({ operationType: 'grow_expand', routerResults }, snapshot),
    runCuratorOperation({ operationType: 'pairings', routerResults }, snapshot),
  ]);

  return {
    routerResults,
    sections,
    pairings: routerResults.pairings || [],
    operations: {
      recordOptimization,
      collectionOptimization,
      purchaseRestock,
      growExpand,
      pairings,
    },
  };
}
