import { toNumber } from './valuationUtils';

export function getTotalValue(items = [], selector = (item) => item?.value) {
  return items.reduce((sum, item) => sum + (toNumber(selector(item)) || 0), 0);
}

export function getAverageValue(items = [], selector = (item) => item?.value) {
  if (!items.length) return null;
  return getTotalValue(items, selector) / items.length;
}

export function getAverageRating(items = [], selector = (item) => item?.rating) {
  const ratings = items.map(selector).map(toNumber).filter((value) => value != null && value > 0);
  if (!ratings.length) return null;
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}

export function countWhere(items = [], predicate = Boolean) {
  return items.reduce((count, item) => count + (predicate(item) ? 1 : 0), 0);
}
