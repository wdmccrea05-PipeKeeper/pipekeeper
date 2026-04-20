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
  { labelKey: 'userReport.diagnostics.sampleLabels.multipleActiveSubscriptions', fallbackLabel: 'Multi-active', key: 'multipleActiveSubscriptions' },
  { labelKey: 'userReport.diagnostics.sampleLabels.activeNoModules', fallbackLabel: 'Active/no-modules', key: 'activeNoModules' },
  { labelKey: 'userReport.diagnostics.sampleLabels.modulesNoActiveSubscription', fallbackLabel: 'Modules/no-active', key: 'modulesNoActiveSubscription' },
  { labelKey: 'userReport.diagnostics.sampleLabels.summaryRuntimeMismatch', fallbackLabel: 'Summary/runtime drift', key: 'summaryRuntimeMismatch' },
  { labelKey: 'userReport.diagnostics.sampleLabels.staleSyncTimestamp', fallbackLabel: 'Stale sync', key: 'staleSyncTimestamp' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedStripeCallbacks', fallbackLabel: 'Failed Stripe callbacks', key: 'failedStripeCallbacks' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedPurchases', fallbackLabel: 'Failed purchases', key: 'failedPurchases' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedRestoreAttempts', fallbackLabel: 'Failed restore attempts', key: 'failedRestoreAttempts' },
  { labelKey: 'userReport.diagnostics.sampleLabels.entitlementMismatches', fallbackLabel: 'Entitlement mismatches', key: 'entitlementMismatches' },
  { labelKey: 'userReport.diagnostics.sampleLabels.importFailures', fallbackLabel: 'Import failures', key: 'importFailures' },
  { labelKey: 'userReport.diagnostics.sampleLabels.scannerFailures', fallbackLabel: 'Scanner failures', key: 'scannerFailures' },
  { labelKey: 'userReport.diagnostics.sampleLabels.routeCrashes', fallbackLabel: 'Route crashes', key: 'routeCrashes' },
  { labelKey: 'userReport.diagnostics.sampleLabels.multiPlanConflicts', fallbackLabel: 'Multi-plan conflicts', key: 'multiPlanConflicts' },
  { labelKey: 'userReport.diagnostics.sampleLabels.activeModuleStateDrift', fallbackLabel: 'Active module state drift', key: 'activeModuleStateDrift' },
  { labelKey: 'userReport.diagnostics.sampleLabels.recentAdminOverrides', fallbackLabel: 'Recent admin overrides', key: 'recentAdminOverrides' },
  { labelKey: 'userReport.diagnostics.sampleLabels.recentSubscriptionStateChanges', fallbackLabel: 'Recent state changes', key: 'recentSubscriptionStateChanges' },
];

export function buildDiagnosticsSampleGroups(diagnostics, options = {}) {
  const maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0
    ? options.maxItems
    : DEFAULT_MAX_ITEMS;
  const translate = typeof options.translate === 'function' ? options.translate : null;

  return GROUP_DEFS
    .map(({ labelKey, fallbackLabel, key }) => {
      const values = Array.isArray(diagnostics?.samples?.[key]) ? diagnostics.samples[key] : [];
      const safeValues = values.slice(0, maxItems).map(maskSampleValue).filter(Boolean);
      const label = translate ? translate(labelKey) : fallbackLabel;
      return { label, labelKey, values: safeValues };
    })
    .filter((group) => group.values.length > 0);
}
