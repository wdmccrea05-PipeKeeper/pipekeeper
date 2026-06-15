import { base44 } from '@/api/base44Client';
import { logCuratorAuditEntry } from '@/lib/curator/curatorAuditLog';
import { validateCuratorImageCandidateForRecord } from '@/lib/curator/curatorImageCandidates';

const SAFE_BLEND_FIELDS = new Set([
  'blend_type', 'blend_family', 'strength', 'cut', 'flavor_notes',
  'tobacco_components', 'room_note', 'notes',
  'replacement_difficulty', 'replacement_difficulty_label',
  'strategy_state', 'strategy_reason',
]);

const SAFE_BOTTLE_FIELDS = new Set([
  'distillery', 'region', 'country', 'age', 'abv', 'type', 'whiskey_type',
  'retail_price', 'aftermarket_price', 'collector_value', 'estimated_value',
  'average_market_value',
  'replacement_difficulty', 'replacement_difficulty_label',
  'strategy_state', 'strategy_reason', 'notes',
]);

const SAFE_PIPE_FIELDS = new Set([
  'specialization', 'shape', 'bowl_style', 'shank_shape', 'bend', 'sizeClass', 'notes', 'condition',
]);

const SAFE_CIGAR_FIELDS = new Set([
  'brand', 'line', 'vitola', 'wrapper', 'binder', 'filler', 'strength', 'body',
  'origin', 'country', 'purchase_price', 'estimated_value', 'quantity', 'singles_equivalent',
  'favorite', 'is_favorite', 'preferred_use', 'strategy_state', 'strategy_reason', 'notes',
]);

const SAFE_WINE_FIELDS = new Set([
  'producer', 'vintage', 'region', 'appellation', 'country', 'varietal', 'wine_type', 'style',
  'purchase_price', 'estimated_value', 'quantity', 'drink_window_status', 'drinking_window_status',
  'strategy_state', 'strategy_reason', 'notes',
]);

const CURATOR_IMAGE_FIELDS = new Set([
  'photo',
  'image',
  'image_url',
  'photo_url',
  'primary_photo',
  'photos',
]);

function filterToSafeFields(changes, allowedSet) {
  const next = {};
  for (const [key, value] of Object.entries(changes || {})) {
    if (!allowedSet.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    next[key] = value;
  }
  return next;
}

export function sanitizeCuratorRecordChanges(changes, { allowedSet = null } = {}) {
  const input = Object.fromEntries(
    Object.entries(changes || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const withoutImages = Object.fromEntries(
    Object.entries(input).filter(([key]) => !CURATOR_IMAGE_FIELDS.has(key))
  );

  if (allowedSet instanceof Set) {
    return filterToSafeFields(withoutImages, allowedSet);
  }

  return withoutImages;
}

function toStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (value == null) return [];
  const next = String(value).trim();
  return next ? [next] : [];
}

function normalizePipeSpecializationValue(spec) {
  return toStringArray(spec);
}

function getEntityHandle(recordType) {
  switch ((recordType || '').toLowerCase()) {
    case 'blend':
    case 'tobacco':
      return base44.entities.TobaccoBlend;
    case 'bottle':
    case 'whiskey':
      return base44.entities.Bottle;
    case 'pipe':
      return base44.entities.Pipe;
    case 'cigar':
      return base44.entities.Cigar;
    case 'wine':
      return base44.entities.Wine;
    default:
      return null;
  }
}

function normalizeAuditModule(recordType) {
  switch ((recordType || '').toLowerCase()) {
    case 'blend':
    case 'tobacco':
    case 'pipe':
      return 'pipekeeper';
    case 'bottle':
    case 'whiskey':
      return 'whiskeykeeper';
    case 'cigar':
      return 'cigarkeeper';
    case 'wine':
      return 'winekeeper';
    default:
      return 'curator';
  }
}

function pickFields(source, fields = []) {
  return fields.reduce((acc, field) => {
    if (source && Object.prototype.hasOwnProperty.call(source, field)) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
}

async function readRecord(recordType, recordId) {
  try {
    const entityHandle = getEntityHandle(recordType);
    if (!entityHandle || typeof entityHandle.get !== 'function') return null;
    return await entityHandle.get(recordId);
  } catch {
    return null;
  }
}

async function updateBlend(recordId, changes) {
  const final = sanitizeCuratorRecordChanges(changes, { allowedSet: SAFE_BLEND_FIELDS });
  if (!Object.keys(final).length) throw new Error('No blend fields to apply.');
  return base44.entities.TobaccoBlend.update(recordId, final);
}

async function updateBottle(recordId, changes) {
  const final = sanitizeCuratorRecordChanges(changes, { allowedSet: SAFE_BOTTLE_FIELDS });
  if (!Object.keys(final).length) throw new Error('No bottle fields to apply.');
  return base44.entities.Bottle.update(recordId, final);
}

async function updatePipe(recordId, changes) {
  const final = sanitizeCuratorRecordChanges(changes, { allowedSet: SAFE_PIPE_FIELDS });
  if (!Object.keys(final).length) throw new Error('No pipe fields to apply.');
  return base44.entities.Pipe.update(recordId, final);
}

async function updateCigar(recordId, changes) {
  const final = sanitizeCuratorRecordChanges(changes, { allowedSet: SAFE_CIGAR_FIELDS });
  if (!Object.keys(final).length) throw new Error('No cigar fields to apply.');
  return base44.entities.Cigar.update(recordId, final);
}

async function updateWine(recordId, changes) {
  const final = sanitizeCuratorRecordChanges(changes, { allowedSet: SAFE_WINE_FIELDS });
  if (!Object.keys(final).length) throw new Error('No wine fields to apply.');
  return base44.entities.Wine.update(recordId, final);
}

async function updateRecord(recordType, recordId, changes) {
  switch ((recordType || '').toLowerCase()) {
    case 'blend':
    case 'tobacco':
      return updateBlend(recordId, changes);
    case 'bottle':
    case 'whiskey':
      return updateBottle(recordId, changes);
    case 'pipe':
      return updatePipe(recordId, changes);
    case 'cigar':
      return updateCigar(recordId, changes);
    case 'wine':
      return updateWine(recordId, changes);
    default:
      throw new Error(`Unsupported record type: ${recordType}`);
  }
}

export async function applyPipeSpecialization(recordId, spec) {
  if (!recordId) throw new Error('Pipe recordId is required.');
  if (!spec) throw new Error('Specialization spec is required.');
  const beforeState = await readRecord('pipe', recordId);
  const normalizedFocus = normalizePipeSpecializationValue(spec);
  if (!normalizedFocus.length) throw new Error('Specialization spec is required.');

  const payload = {
    focus: normalizedFocus,
    specialization: normalizedFocus[0],
  };
  const updated = await base44.entities.Pipe.update(recordId, payload);

  await logCuratorAuditEntry({
    recommendationId: null,
    module: 'pipekeeper',
    recordType: 'pipe',
    recordId,
    operationType: 'specialization_update',
    fieldsChanged: ['focus', 'specialization'],
    previousValues: {
      focus: beforeState?.focus ?? null,
      specialization: beforeState?.specialization ?? null,
    },
    newValues: {
      focus: updated?.focus ?? payload.focus,
      specialization: updated?.specialization ?? payload.specialization,
    },
    source: 'curator_specialization_review',
    appliedAutomatically: false,
    requiredUserApproval: true,
  });

  return updated;
}

export async function applySingleItemFix(item) {
  if (!item?.recordId) throw new Error('Item is missing recordId.');
  if (!item?.recordType) throw new Error('Item is missing recordType.');
  if (!item?.proposedChange?.payload || !Object.keys(item.proposedChange.payload).length) {
    throw new Error('No proposed change payload available.');
  }
  const updated = await updateRecord(item.recordType, item.recordId, item.proposedChange.payload);
  return { ok: true, appliedCount: 1, resolvedRecordIds: [item.recordId], updatedRecords: [updated] };
}

async function applyCuratorItemUpdate(item, payload, recommendation, action, opts = {}) {
  const sanitizedPayload = sanitizeCuratorRecordChanges(payload);
  if (!Object.keys(sanitizedPayload).length) {
    throw new Error('Curator image updates require reviewed image candidates before they can be applied.');
  }

  const beforeState = await readRecord(item.recordType, item.recordId);
  const updated = await updateRecord(item.recordType, item.recordId, sanitizedPayload);
  const fieldsChanged = Object.keys(sanitizedPayload);

  await logCuratorAuditEntry({
    userId: opts.userEmail || null,
    recommendationId: recommendation?.id || null,
    module: normalizeAuditModule(item.recordType),
    recordType: item.recordType,
    recordId: item.recordId,
    operationType: recommendation?.goal || action,
    fieldsChanged,
    previousValues: pickFields(beforeState, fieldsChanged),
    newValues: pickFields(updated, fieldsChanged),
    source: item?.proposedChange?.rationale || recommendation?.summary || 'curator',
    confidence: item?.proposedChange?.confidence ?? recommendation?.confidence ?? null,
    appliedAutomatically: action === 'apply_fix',
    requiredUserApproval: action !== 'apply_fix',
  });

  return updated;
}

async function applyReviewedCandidateIfPresent(item, opts = {}) {
  const imageCandidate = item?.reviewedImageCandidate || item?.imageCandidate || item?.approvedImageCandidate || null;
  if (!imageCandidate) return null;
  return applyReviewedImageCandidate(item.recordType, item.recordId, imageCandidate, {
    userEmail: opts.userEmail || null,
    approved: true,
    mode: opts.imageApplyMode || imageCandidate.mode || 'add',
  });
}

function getCanonicalImageField(recordType = '') {
  switch (String(recordType || '').toLowerCase()) {
    case 'pipe':
      return 'photo';
    case 'blend':
    case 'tobacco':
    case 'bottle':
    case 'whiskey':
    case 'cigar':
    case 'wine':
      return 'image_url';
    default:
      return 'image_url';
  }
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function extractRecordImages(record = {}) {
  return uniqueStrings([
    record?.photo,
    record?.image,
    record?.image_url,
    record?.photo_url,
    record?.primary_photo,
    ...(Array.isArray(record?.photos) ? record.photos : []),
  ]);
}

function buildImageApplyPayload(record = {}, recordType, imageUrl, mode = 'add') {
  const canonicalField = getCanonicalImageField(recordType);
  const existingImages = extractRecordImages(record);
  const nextImages = uniqueStrings([...existingImages, imageUrl]);
  const hasExisting = existingImages.length > 0;
  const replace = mode === 'replace';

  if (replace || !hasExisting) {
    return { [canonicalField]: imageUrl };
  }

  const currentPhotos = Array.isArray(record?.photos) ? record.photos : [];
  const photos = uniqueStrings([...currentPhotos, imageUrl]);
  return { photos };
}

export async function applyReviewedImageCandidate(recordType, recordId, imageCandidate, opts = {}) {
  const {
    userEmail = null,
    approved = false,
    mode = 'add',
  } = opts;

  if (!approved) throw new Error('Reviewed image candidates require explicit approval.');
  if (!recordId) throw new Error('recordId is required.');
  if (!imageCandidate || typeof imageCandidate !== 'object') {
    throw new Error('imageCandidate is required.');
  }
  if (imageCandidate.resolvedBy !== 'resolveCuratorImageCandidates') {
    throw new Error('Image candidate must come from resolveCuratorImageCandidates().');
  }

  const beforeState = await readRecord(recordType, recordId);
  if (!beforeState) throw new Error('Record not found.');

  const validation = validateCuratorImageCandidateForRecord({
    record: { ...beforeState, recordType },
    candidate: imageCandidate,
  });
  if (!validation.valid || validation.referenceOnly) {
    throw new Error('Image candidate failed identity validation.');
  }

  const payload = buildImageApplyPayload(beforeState, recordType, imageCandidate.imageUrl, mode);
  const entityHandle = getEntityHandle(recordType);
  if (!entityHandle || typeof entityHandle.update !== 'function') {
    throw new Error(`Unsupported record type: ${recordType}`);
  }
  const updated = await entityHandle.update(recordId, payload);
  const fieldsChanged = Object.keys(payload);

  await logCuratorAuditEntry({
    userId: userEmail,
    recommendationId: null,
    module: normalizeAuditModule(recordType),
    recordType,
    recordId,
    operationType: 'apply_reviewed_image_candidate',
    fieldsChanged,
    previousValues: pickFields(beforeState, fieldsChanged),
    newValues: pickFields(updated, fieldsChanged),
    source: imageCandidate.source || 'curator_image_review',
    confidence: imageCandidate.confidence ?? null,
    appliedAutomatically: false,
    requiredUserApproval: true,
  });

  return {
    ok: true,
    updated,
    appliedField: fieldsChanged[0] || null,
  };
}

/**
 * §3 RECORD NAVIGATION — always route to detail pages, never to module list pages.
 * Single item → detail page.  Multi-item → list page with filter.
 */
function singleRecordPath(item) {
  const rt = String(item?.recordType || '').toLowerCase();
  const id = item?.recordId || item?.id;
  if (!id) return null;
  if (rt === 'bottle' || rt === 'whiskey') return `/BottleDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'blend'  || rt === 'tobacco') return `/TobaccoDetail?id=${encodeURIComponent(id)}`;
  if (rt === 'pipe')                       return `/PipeDetail?id=${encodeURIComponent(id)}`;
  return null;
}

export function buildViewItemsNavigation(recommendation) {
  const items = recommendation?.items || [];
  const first = items[0];

  // Single item → go directly to detail page
  if (items.length === 1 && first) {
    const path = singleRecordPath(first);
    if (path) {
      return { ok: true, navigate: { path, itemIds: [first.recordId || first.id].filter(Boolean) } };
    }
  }

  // Multi-item → module list page with curator_ids filter
  const itemIds = items.map((i) => i.recordId || i.id).filter(Boolean);
  const rt = String(first?.recordType || '').toLowerCase();
  const listPage =
    rt === 'bottle' || rt === 'whiskey' ? 'Whiskey' :
    rt === 'blend'  || rt === 'tobacco' ? 'Tobacco' :
    rt === 'pipe'                        ? 'Pipes'   : 'CollectionHub';

  const params = new URLSearchParams();
  if (itemIds.length) params.set('curator_ids', itemIds.join(','));
  if (recommendation?.goal) params.set('curator_hint', recommendation.goal);

  return {
    ok: true,
    navigate: {
      path: `/${listPage}${params.toString() ? `?${params.toString()}` : ''}`,
      itemIds,
    },
  };
}

export async function executeRecommendationAction(recommendation, action, opts = {}) {
  if (!recommendation) {
    return { ok: false, error: 'Recommendation is required.' };
  }

  const items = Array.isArray(recommendation.items) ? recommendation.items : [];

  switch (action) {
    case 'view_items':
    case 'view_details':
      return buildViewItemsNavigation(recommendation);

    case 'apply_fix': {
      const candidates = opts.itemId
        ? items.filter((i) => i.recordId === opts.itemId || i.id === opts.itemId)
        : items;

      const toApply = candidates.filter(
        (i) => i?.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0
      );

      if (!toApply.length) return { ok: false, error: 'No auto-fix payloads available.' };

      const resolvedRecordIds = [];
      const updatedRecords = [];
      const failedIds = [];

      for (const item of toApply) {
        try {
          const updated = await applyCuratorItemUpdate(
            item,
            item.proposedChange.payload,
            recommendation,
            action,
            opts
          );
          resolvedRecordIds.push(item.recordId);
          updatedRecords.push(updated);
        } catch {
          failedIds.push(item.recordId);
        }
      }

      return {
        ok: resolvedRecordIds.length > 0,
        appliedCount: resolvedRecordIds.length,
        resolvedRecordIds,
        resolvedRecommendationIds: resolvedRecordIds.length ? [recommendation.id] : [],
        updatedRecords,
        failedIds,
        error: resolvedRecordIds.length ? undefined : 'No record updates were applied.',
      };
    }

    case 'approve_changes': {
      const reviewedItems = Array.isArray(opts.reviewedItems) ? opts.reviewedItems : items;
      if (!reviewedItems.length) return { ok: false, error: 'No reviewed items to apply.' };

      const resolvedRecordIds = [];
      const updatedRecords = [];
      const failedIds = [];

      for (const item of reviewedItems) {
        const payload = item?.proposedChange?.payload;
        try {
          if (payload && Object.keys(payload).length > 0) {
            const updated = await applyCuratorItemUpdate(
              item,
              payload,
              recommendation,
              action,
              opts
            );
            resolvedRecordIds.push(item.recordId);
            updatedRecords.push(updated);
            continue;
          }

          const imageResult = await applyReviewedCandidateIfPresent(item, opts);
          if (imageResult?.ok) {
            resolvedRecordIds.push(item.recordId);
            updatedRecords.push(imageResult.updated);
          }
        } catch {
          failedIds.push(item.recordId);
        }
      }

      return {
        ok: resolvedRecordIds.length > 0,
        appliedCount: resolvedRecordIds.length,
        resolvedRecordIds,
        resolvedRecommendationIds: resolvedRecordIds.length ? [recommendation.id] : [],
        updatedRecords,
        failedIds,
        error: resolvedRecordIds.length ? undefined : 'No reviewed changes were applied.',
      };
    }

    case 'apply_suggestion': {
      // apply_suggestion: same as approve_changes — apply all items with payloads
      const reviewedItems = Array.isArray(opts.reviewedItems) ? opts.reviewedItems : items;
      const toApply = reviewedItems.filter(
        (i) => (i?.proposedChange?.payload && Object.keys(i.proposedChange.payload).length > 0) || i?.reviewedImageCandidate || i?.imageCandidate || i?.approvedImageCandidate
      );

      if (!toApply.length) {
        // No payloads — treat as acknowledged (advisory with no data changes)
        return {
          ok: true,
          appliedCount: 0,
          resolvedRecordIds: items.map((i) => i.recordId || i.id).filter(Boolean),
          resolvedRecommendationIds: [recommendation.id],
          updatedRecords: [],
        };
      }

      const resolvedRecordIds = [];
      const updatedRecords = [];
      const failedIds = [];

      for (const item of toApply) {
        try {
          if (item?.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0) {
            const updated = await applyCuratorItemUpdate(
              item,
              item.proposedChange.payload,
              recommendation,
              action,
              opts
            );
            resolvedRecordIds.push(item.recordId);
            updatedRecords.push(updated);
            continue;
          }

          const imageResult = await applyReviewedCandidateIfPresent(item, opts);
          if (imageResult?.ok) {
            resolvedRecordIds.push(item.recordId);
            updatedRecords.push(imageResult.updated);
          }
        } catch {
          failedIds.push(item.recordId);
        }
      }

      return {
        ok: resolvedRecordIds.length > 0 || toApply.length === 0,
        appliedCount: resolvedRecordIds.length,
        resolvedRecordIds,
        resolvedRecommendationIds: [recommendation.id],
        updatedRecords,
        failedIds,
        error: resolvedRecordIds.length ? undefined : 'No changes were applied.',
      };
    }

    case 'add_to_rotation':
    case 'mark_for_session':
    case 'accept_reassignment':
    case 'reject_reassignment':
    case 'acknowledge':
    case 'save_pairing':
      return {
        ok: true,
        appliedCount: items.length || 1,
        resolvedRecordIds: items.map((i) => i.recordId || i.id).filter(Boolean),
        resolvedRecommendationIds: [recommendation.id],
        updatedRecords: [],
      };

    case 'move_to_shopping_list':
    case 'add_to_want_list': {
      const userEmail = opts.userEmail;
      if (!userEmail) return { ok: false, error: 'User email is required.' };

      const sourceItems = opts.itemId
        ? items.filter((i) => i.recordId === opts.itemId || i.id === opts.itemId)
        : items;

      const created = [];
      const failedIds = [];

      for (const item of sourceItems) {
        const recordId = item.recordId || item.id;
        try {
          if (action === 'move_to_shopping_list' && item.acquisitionId) {
            // §2.2 IDEMPOTENT: update existing AcquisitionItem in-place — no duplicate
            await base44.entities.AcquisitionItem.update(item.acquisitionId, { status: 'shopping_list' });
            created.push({ id: item.acquisitionId, updated: true });

          } else if (action === 'add_to_want_list') {
            // §2.2 IDEMPOTENT: check for existing AcquisitionItem before creating
            let existing = null;
            if (item.acquisitionId) {
              // Already tracked — just ensure status is wishlist
              await base44.entities.AcquisitionItem.update(item.acquisitionId, { status: 'wishlist' });
              existing = { id: item.acquisitionId, updated: true };
            } else if (recordId) {
              // Look for an existing row with matching source record
              const rows = await base44.entities.AcquisitionItem.filter({ created_by: userEmail }).catch(() => []);
              existing = rows.find((r) => r.record_id === recordId || r.source_record_id === recordId) || null;
            }

            if (existing) {
              created.push(existing);
            } else {
              // §5.3 Create new AcquisitionItem with status 'wishlist' (NOT ShoppingListItem)
              const row = await base44.entities.AcquisitionItem.create({
                name:      item.recordName || item.itemName || item.name || '—',
                item_type: item.recordType || item.itemType || 'blend',
                status:    'wishlist',
                priority:  'medium',
                notes:     '',
                record_id: recordId || undefined,
              });
              created.push(row);
            }

          } else {
            // move_to_shopping_list without acquisitionId → create AcquisitionItem in shopping_list state
            const rows = await base44.entities.AcquisitionItem.filter({ created_by: userEmail }).catch(() => []);
            const activeRows = rows.filter((r) => r.status !== 'archived');
            const itemName = (item.recordName || item.itemName || item.name || '').toLowerCase().trim();
            const existing = recordId
              ? activeRows.find((r) => r.record_id === recordId || r.source_record_id === recordId)
              : itemName
                ? activeRows.find((r) => (r.name || '').toLowerCase().trim() === itemName)
                : null;

            if (existing) {
              if (existing.status !== 'shopping_list') {
                await base44.entities.AcquisitionItem.update(existing.id, { status: 'shopping_list' });
              }
              created.push(existing);
            } else {
              const row = await base44.entities.AcquisitionItem.create({
                name:      item.recordName || item.itemName || item.name || '—',
                item_type: item.recordType || item.itemType || 'blend',
                status:    'shopping_list',
                priority:  'medium',
                notes:     '',
                record_id: recordId || undefined,
              });
              created.push(row);
            }
          }
        } catch {
          failedIds.push(recordId);
        }
      }

      return {
        ok: created.length > 0,
        appliedCount: created.length,
        resolvedRecordIds: sourceItems.map((i) => i.recordId || i.id).filter(Boolean),
        resolvedRecommendationIds: created.length ? [recommendation.id] : [],
        updatedRecords: created,
        failedIds,
        error: created.length ? undefined : 'No acquisition items were created or updated.',
      };
    }

    // §2.3 OPEN_RECORD — navigation only, no DB mutation
    case 'open_record': {
      const first = items[0];
      if (!first) return { ok: false, error: 'No record to open.' };
      const path = singleRecordPath(first);
      if (path) window.location.href = path;
      return { ok: !!path, navigate: { path }, resolvedRecordIds: [], resolvedRecommendationIds: [] };
    }

    // §2.3 TRACK_FOR_RESTOCK — set AcquisitionItem status to 'restock'
    case 'track_for_restock': {
      const userEmail = opts.userEmail;
      if (!userEmail) return { ok: false, error: 'User email is required.' };
      const sourceItems = opts.itemId
        ? items.filter((i) => i.recordId === opts.itemId || i.id === opts.itemId)
        : items;
      const resolved = [];
      for (const item of sourceItems) {
        const recordId = item.recordId || item.id;
        if (item.acquisitionId) {
          await base44.entities.AcquisitionItem.update(item.acquisitionId, { status: 'restock' });
          resolved.push(item.acquisitionId);
        } else {
          const rows = await base44.entities.AcquisitionItem.filter({ created_by: userEmail }).catch(() => []);
          const existing = recordId ? rows.find((r) => r.record_id === recordId) : null;
          if (existing) {
            if (existing.status !== 'restock') await base44.entities.AcquisitionItem.update(existing.id, { status: 'restock' });
            resolved.push(existing.id);
          } else {
            const row = await base44.entities.AcquisitionItem.create({
              name: item.recordName || item.name || '—', item_type: item.recordType || 'blend',
              status: 'restock', priority: 'high', notes: '', record_id: recordId || undefined,
            });
            resolved.push(row.id);
          }
        }
      }
      return { ok: resolved.length > 0, appliedCount: resolved.length, resolvedRecordIds: sourceItems.map((i) => i.recordId || i.id).filter(Boolean), resolvedRecommendationIds: resolved.length ? [recommendation.id] : [], updatedRecords: [] };
    }

    // §2.3 ARCHIVE_ITEM — mark AcquisitionItem as archived (idempotent)
    case 'archive_item': {
      const userEmail = opts.userEmail;
      if (!userEmail) return { ok: false, error: 'User email is required.' };
      const sourceItems = opts.itemId
        ? items.filter((i) => i.recordId === opts.itemId || i.id === opts.itemId)
        : items;
      const resolved = [];
      for (const item of sourceItems) {
        if (item.acquisitionId) {
          await base44.entities.AcquisitionItem.update(item.acquisitionId, { status: 'archived' });
          resolved.push(item.acquisitionId);
        }
      }
      return { ok: resolved.length > 0, appliedCount: resolved.length, resolvedRecordIds: sourceItems.map((i) => i.recordId || i.id).filter(Boolean), resolvedRecommendationIds: resolved.length ? [recommendation.id] : [], updatedRecords: [] };
    }

    // §2.3 MARK_REVIEWED — remove from Curator view (idempotent, optimistic)
    case 'mark_reviewed':
      return {
        ok: true,
        appliedCount: items.length || 1,
        resolvedRecordIds: items.map((i) => i.recordId || i.id).filter(Boolean),
        resolvedRecommendationIds: [recommendation.id],
        updatedRecords: [],
      };

    case 'ask_curator':
      return { ok: true, appliedCount: 0, resolvedRecordIds: [], resolvedRecommendationIds: [], updatedRecords: [] };

    default:
      return { ok: false, error: `Unsupported action: ${action}` };
  }
}