import { ACTION_TYPE } from './recommendationSchema.js';

export const CURATOR_AUTO_APPLY_POLICY = {
  taskBased: 'auto_apply',
  deterministicCalculation: 'auto_apply',
  dataEnrichment: 'auto_apply_when_confident',
  normalization: 'auto_apply',
  duplicateMerge: 'review_if_uncertain',
  imageUpdate: 'review_required',
  opinionBasedUseChange: 'review_required',
  subjectiveClassification: 'review_required',
  collectionStrategyChange: 'review_required',
};

const OPINION_GOAL_MATCHERS = [
  'special',
  'favorite',
  'rotation',
  'strategy',
  'hold',
  'drink',
  'aging',
  'ageing',
  'retire',
  'preferred_use',
];

const IMAGE_FIELD_KEYS = new Set([
  'photo',
  'image',
  'image_url',
  'photo_url',
  'primary_photo',
  'photos',
]);

function hasPayloadFields(item) {
  return !!(item?.proposedChange?.payload && Object.keys(item.proposedChange.payload).length > 0);
}

function hasImagePayload(item) {
  return Object.keys(item?.proposedChange?.payload || {}).some((key) => IMAGE_FIELD_KEYS.has(key));
}

function normalizeConfidence(value) {
  if (typeof value === 'number') return value;
  if (value === 'high') return 0.9;
  if (value === 'medium') return 0.6;
  if (value === 'low') return 0.3;
  return 0;
}

export function getCuratorAutoApplyDisposition(recommendation = {}, policy = CURATOR_AUTO_APPLY_POLICY) {
  const goal = String(recommendation?.goal || '').toLowerCase();
  const actionType = String(recommendation?.actionType || '').toLowerCase();
  const items = Array.isArray(recommendation?.items) ? recommendation.items : [];
  const actionableItems = items.filter(hasPayloadFields);
  const hasImages = actionableItems.some(hasImagePayload);
  const isOpinionBased = OPINION_GOAL_MATCHERS.some((token) => goal.includes(token));
  const maxConfidence = actionableItems.reduce(
    (max, item) => Math.max(max, normalizeConfidence(item?.proposedChange?.confidence)),
    normalizeConfidence(recommendation?.confidence)
  );

  if (hasImages) {
    return {
      policyKey: 'imageUpdate',
      policyValue: policy.imageUpdate,
      autoApply: false,
      reviewRequired: true,
      confidence: maxConfidence,
    };
  }

  if (isOpinionBased || actionType === ACTION_TYPE.REVIEW_REQUIRED) {
    return {
      policyKey: isOpinionBased ? 'opinionBasedUseChange' : 'dataEnrichment',
      policyValue: isOpinionBased ? policy.opinionBasedUseChange : policy.dataEnrichment,
      autoApply: false,
      reviewRequired: true,
      confidence: maxConfidence,
    };
  }

  if (actionType === ACTION_TYPE.AUTO_FIX) {
    const autoApply = maxConfidence >= 0.85 || actionableItems.length === 0;
    return {
      policyKey: actionableItems.length > 0 ? 'dataEnrichment' : 'deterministicCalculation',
      policyValue: actionableItems.length > 0 ? policy.dataEnrichment : policy.deterministicCalculation,
      autoApply,
      reviewRequired: !autoApply,
      confidence: maxConfidence,
    };
  }

  return {
    policyKey: 'taskBased',
    policyValue: policy.taskBased,
    autoApply: false,
    reviewRequired: actionType !== ACTION_TYPE.ADVISORY,
    confidence: maxConfidence,
  };
}
