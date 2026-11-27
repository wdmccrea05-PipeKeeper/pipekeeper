import { base44 } from '@/api/base44Client';

/**
 * Records Pro feature usage for campaign attribution. The backend ignores the
 * call unless the collector has a live appreciation grant, so this is a no-op
 * for paid and free accounts.
 */
export function trackAppreciationFeatureUse(feature, module) {
  if (!feature) return;
  base44.functions
    .invoke('recordAppreciationEvent', { event_type: 'feature_use', feature, module })
    .catch(() => {});
}

export default trackAppreciationFeatureUse;