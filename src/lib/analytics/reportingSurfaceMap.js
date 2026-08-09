export const REPORTING_SURFACE_CANONICAL_SOURCES = {
  '/src/pages/UserReport.jsx': ['getUserSubscriptionReportV3'],
  '/src/pages/ReconciliationDashboard.jsx': ['getUserSubscriptionReportV3', 'getUnmatchedPayments'],
  '/src/pages/CuratorAnalyticsDashboard.jsx': ['getRecommendationAnalytics', 'getUserSegmentAnalytics'],
  '/src/platform/dashboard.js': ['canonical collection aggregate'],
  '/src/platform/reporting.js': ['canonical collection aggregate'],
  '/src/platform/exportEngine.js': ['canonical collection aggregate'],
  '/src/components/export/*': ['platform export engine and canonical collection aggregate'],
};
