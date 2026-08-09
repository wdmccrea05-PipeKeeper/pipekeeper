export const FORMAL_AUDIT_OUTPUTS = {
  architectureMap: {
    canonicalFunction: 'base44/functions/getUserSubscriptionReportV3/entry.ts',
    sharedClientService: 'src/lib/analytics/canonicalAnalyticsService.js',
    reportingSurfaces: [
      'src/pages/UserReport.jsx',
      'src/pages/ReconciliationDashboard.jsx',
      'src/pages/CuratorAnalyticsDashboard.jsx',
      'src/platform/dashboard.js',
      'src/platform/reporting.js',
      'src/platform/exportEngine.js',
      'src/components/export/*',
    ],
  },
  duplicateLogicInventory: [
    'base44/functions/getUserSubscriptionReportV3/entry.ts',
    'src/lib/reporting/reportingLogic.js',
    'src/lib/reporting/subscriptionLedger.js',
    'base44/functions/_shared/reportingMetrics.ts',
    'base44/functions/exportReconciliationCsv/entry.ts',
  ],
  missingBusinessVariables: [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'verification milestones',
    'first_login_at',
    'last_login_at',
    'platform_history',
    'device_history',
  ],
  unresolvedBiGaps: [
    'cross-surface KPI parity automation still requires broader fixture matrix',
    'legacy exports still contain per-page formatting logic',
  ],
};
