export const CANONICAL_REPORTING_TIMEZONE = 'America/Indianapolis';

export const LIFECYCLE_PHASES = [
  'identity',
  'acquisition',
  'activation',
  'engagement',
  'subscription',
  'revenue',
  'retention',
  'churn',
];

export const CANONICAL_METRIC_DICTIONARY = {
  total_registered_users: {
    phase: 'identity',
    formula: 'count(distinct user_id) where account_status != merged/disabled',
    sourceEntities: ['User'],
    inclusionRule: 'registered non-merged users only',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  new_registrations_period: {
    phase: 'acquisition',
    formula: 'count(users.created_at in selected range)',
    sourceEntities: ['User'],
    inclusionRule: 'range end inclusive local end-of-day',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  active_users_30d: {
    phase: 'engagement',
    formula: 'count(users with real DailyUserMetrics activity in trailing 30d)',
    sourceEntities: ['DailyUserMetrics', 'User'],
    inclusionRule: 'activity fields must be > 0',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  current_paying_users: {
    phase: 'subscription',
    formula: 'count(distinct users with canonical status active_paid|canceling_but_entitled)',
    sourceEntities: ['ActiveContract', 'Subscription', 'SubscriptionEvent'],
    inclusionRule: 'deduped canonical subscription lifecycles',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  current_entitled_users: {
    phase: 'subscription',
    formula: 'count(distinct users with paying/trial entitlement or explicit grants)',
    sourceEntities: ['ActiveContract', 'UserEntitlement', 'ReferralAccess'],
    inclusionRule: 'includes non-paying entitlement grants',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  new_first_time_paid_users: {
    phase: 'acquisition',
    formula: 'count(users whose resolved first_paid_at falls in range)',
    sourceEntities: ['SubscriptionEvent', 'Subscription', 'ActiveContract'],
    inclusionRule: 'first-paid confidence category retained',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  mrr: {
    phase: 'revenue',
    formula: 'sum(current paying contract amount normalized to month)',
    sourceEntities: ['ActiveContract', 'Subscription'],
    inclusionRule: 'known amount + known billing interval only',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  arr: {
    phase: 'revenue',
    formula: 'mrr * 12',
    sourceEntities: ['ActiveContract', 'Subscription'],
    inclusionRule: 'derived from canonical MRR',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  reactivated_paid_users: {
    phase: 'retention',
    formula: 'count(users with paid lapse followed by later paid restart)',
    sourceEntities: ['ActiveContract', 'SubscriptionEvent'],
    inclusionRule: 'requires prior lifecycle gap evidence',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
  canceled_subscriptions: {
    phase: 'churn',
    formula: 'count(canonical lifecycles with canceled_at in range)',
    sourceEntities: ['ActiveContract', 'SubscriptionEvent'],
    inclusionRule: 'event-driven when available, contract fallback otherwise',
    timezone: CANONICAL_REPORTING_TIMEZONE,
  },
};

export function getMetricDefinition(metricName) {
  return CANONICAL_METRIC_DICTIONARY[metricName] || null;
}
