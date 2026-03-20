/**
 * DEPRECATED — use collectionAggregation instead.
 * This shim exists only to prevent import errors.
 */
export { aggregateCollection as getCombinedCollectionSummary } from '@/components/keeper-core/aggregation/collectionAggregation';

// Legacy stub — kept for backward compat
export async function getModuleSummary(moduleType, userEmail) {
  const { aggregateCollection } = await import('@/components/keeper-core/aggregation/collectionAggregation');
  const data = await aggregateCollection(userEmail);
  if (moduleType === 'pipes') return data.pipes;
  if (moduleType === 'tobacco') return data.tobacco;
  if (moduleType === 'bottles') return data.whiskey;
  return { count: 0, value: 0 };
}