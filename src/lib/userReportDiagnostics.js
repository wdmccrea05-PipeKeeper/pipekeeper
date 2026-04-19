const DEFAULT_MAX_ITEMS = 6;

function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

export function maskEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) return normalized || 'unknown';
  const [local, domain] = normalized.split('@');
  const visibleLocal = local.slice(0, 2);
  const maskedLocal = `${visibleLocal}${'*'.repeat(Math.max(1, local.length - 2))}`;
  return `${maskedLocal}@${domain}`;
}

function maskSampleValue(value) {
  const text = String(value || '');
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!emailMatch) return text;
  const email = normalizeEmail(emailMatch[0]);
  return text.replace(emailMatch[0], maskEmail(email));
}

const GROUP_DEFS = [
  { label: 'Multi-active', key: 'multipleActiveSubscriptions' },
  { label: 'Active/no-modules', key: 'activeNoModules' },
  { label: 'Modules/no-active', key: 'modulesNoActiveSubscription' },
  { label: 'Summary/runtime drift', key: 'summaryRuntimeMismatch' },
  { label: 'Stale sync', key: 'staleSyncTimestamp' },
  { label: 'Failed Stripe callbacks', key: 'failedStripeCallbacks' },
  { label: 'Failed purchases', key: 'failedPurchases' },
  { label: 'Failed restore attempts', key: 'failedRestoreAttempts' },
  { label: 'Entitlement mismatches', key: 'entitlementMismatches' },
  { label: 'Import failures', key: 'importFailures' },
  { label: 'Scanner failures', key: 'scannerFailures' },
  { label: 'Route crashes', key: 'routeCrashes' },
  { label: 'Multi-plan conflicts', key: 'multiPlanConflicts' },
  { label: 'Active module state drift', key: 'activeModuleStateDrift' },
  { label: 'Recent admin overrides', key: 'recentAdminOverrides' },
  { label: 'Recent state changes', key: 'recentSubscriptionStateChanges' },
];

export function buildDiagnosticsSampleGroups(diagnostics, options = {}) {
  const maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0
    ? options.maxItems
    : DEFAULT_MAX_ITEMS;

  return GROUP_DEFS
    .map(({ label, key }) => {
      const values = Array.isArray(diagnostics?.samples?.[key]) ? diagnostics.samples[key] : [];
      const safeValues = values.slice(0, maxItems).map(maskSampleValue).filter(Boolean);
      return { label, values: safeValues };
    })
    .filter((group) => group.values.length > 0);
}
