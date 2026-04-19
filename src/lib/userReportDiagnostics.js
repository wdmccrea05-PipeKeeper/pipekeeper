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
  { labelKey: 'userReport.diagnostics.sampleLabels.multipleActiveSubscriptions', key: 'multipleActiveSubscriptions' },
  { labelKey: 'userReport.diagnostics.sampleLabels.activeNoModules', key: 'activeNoModules' },
  { labelKey: 'userReport.diagnostics.sampleLabels.modulesNoActiveSubscription', key: 'modulesNoActiveSubscription' },
  { labelKey: 'userReport.diagnostics.sampleLabels.summaryRuntimeMismatch', key: 'summaryRuntimeMismatch' },
  { labelKey: 'userReport.diagnostics.sampleLabels.staleSyncTimestamp', key: 'staleSyncTimestamp' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedStripeCallbacks', key: 'failedStripeCallbacks' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedPurchases', key: 'failedPurchases' },
  { labelKey: 'userReport.diagnostics.sampleLabels.failedRestoreAttempts', key: 'failedRestoreAttempts' },
  { labelKey: 'userReport.diagnostics.sampleLabels.entitlementMismatches', key: 'entitlementMismatches' },
  { labelKey: 'userReport.diagnostics.sampleLabels.importFailures', key: 'importFailures' },
  { labelKey: 'userReport.diagnostics.sampleLabels.scannerFailures', key: 'scannerFailures' },
  { labelKey: 'userReport.diagnostics.sampleLabels.routeCrashes', key: 'routeCrashes' },
  { labelKey: 'userReport.diagnostics.sampleLabels.multiPlanConflicts', key: 'multiPlanConflicts' },
  { labelKey: 'userReport.diagnostics.sampleLabels.activeModuleStateDrift', key: 'activeModuleStateDrift' },
  { labelKey: 'userReport.diagnostics.sampleLabels.recentAdminOverrides', key: 'recentAdminOverrides' },
  { labelKey: 'userReport.diagnostics.sampleLabels.recentSubscriptionStateChanges', key: 'recentSubscriptionStateChanges' },
];

export function buildDiagnosticsSampleGroups(diagnostics, options = {}) {
  const maxItems = Number.isInteger(options.maxItems) && options.maxItems > 0
    ? options.maxItems
    : DEFAULT_MAX_ITEMS;
  const translate = typeof options.translate === 'function' ? options.translate : null;

  return GROUP_DEFS
    .map(({ labelKey, key }) => {
      const values = Array.isArray(diagnostics?.samples?.[key]) ? diagnostics.samples[key] : [];
      const safeValues = values.slice(0, maxItems).map(maskSampleValue).filter(Boolean);
      const label = translate ? translate(labelKey) : labelKey;
      return { label, labelKey, values: safeValues };
    })
    .filter((group) => group.values.length > 0);
}
