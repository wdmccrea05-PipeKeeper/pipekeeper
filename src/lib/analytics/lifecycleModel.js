import { CANONICAL_REPORTING_TIMEZONE, LIFECYCLE_PHASES } from './canonicalMetricDictionary';

export const CANONICAL_LIFECYCLE_MODEL = {
  version: 'v1-lifecycle-canonical',
  timezone: CANONICAL_REPORTING_TIMEZONE,
  phases: LIFECYCLE_PHASES,
  entities: {
    identity: ['User'],
    acquisition: ['User', 'SubscriptionEvent', 'Subscription', 'ActiveContract'],
    activation: ['Subscription', 'ActiveContract'],
    engagement: ['DailyUserMetrics', 'CuratorMessage', 'CuratorSession'],
    subscription: ['ActiveContract', 'Subscription', 'SubscriptionEvent', 'UserEntitlement'],
    revenue: ['SubscriptionEvent', 'ActiveContract'],
    retention: ['SubscriptionEvent', 'ActiveContract'],
    churn: ['SubscriptionEvent', 'ActiveContract'],
  },
};

export function buildLifecycleEnvelope({ range, report }) {
  return {
    model: CANONICAL_LIFECYCLE_MODEL,
    range,
    generatedAt: report?.meta?.generatedAt || new Date().toISOString(),
    reportVersion: report?.meta?.reportVersion || 'unknown',
  };
}
