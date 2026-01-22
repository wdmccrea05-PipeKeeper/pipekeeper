/**
 * PIPEKEEPER TIER MAPPING & FEATURE MATRIX
 * 
 * This file documents the subscription tiers, features, and entitlement logic.
 * It serves as the single source of truth for what features are available in each tier.
 */

/**
 * TIER DEFINITIONS
 * ================
 * 
 * Free: Limited collection tracking
 *   - 3 pipes, 10 tobacco blends, 10 smoking logs, 1 photo per item
 *   - No AI tools or analytics
 * 
 * Premium: Full collection features + basic AI tools
 *   - Unlimited pipes, blends, logs, and photos
 *   - AI photo identification, value lookup, bulk updates
 *   - Basic pairing matrix
 * 
 * Pro: All Premium features + advanced AI analytics
 *   - Everything in Premium, plus:
 *   - Advanced pairing optimization
 *   - Collection optimization & gap analysis
 *   - Break-in schedules
 *   - Specialization recommendations
 *   - Report exports (PDF/Excel)
 *   - Advanced analytics insights
 * 
 * Premium Legacy: Grandfathered early adopters
 *   - Users who subscribed before 2025-01-15
 *   - Get all Pro features at Premium pricing
 *   - Permanent grandfathered status
 */

/**
 * PRO LAUNCH CUTOFF
 * ================
 * Users with subscription.started_at before this date are Premium Legacy
 */
export const PRO_LAUNCH_CUTOFF_ISO = '2025-01-15T00:00:00Z';

/**
 * FEATURE MATRIX
 * ==============
 * 
 * Collection Management:
 * ----------------------
 * Feature                  | Free | Premium | Pro | Legacy Premium
 * ------------------------|------|---------|-----|---------------
 * Pipes                   | 3    | ∞       | ∞   | ∞
 * Tobacco Blends          | 10   | ∞       | ∞   | ∞
 * Photos per Item         | 1    | ∞       | ∞   | ∞
 * Smoking Logs            | 10   | ∞       | ∞   | ∞
 * 
 * AI Tools - Identification:
 * --------------------------
 * Feature                  | Free | Premium | Pro | Legacy Premium
 * ------------------------|------|---------|-----|---------------
 * AI Photo Identification | ❌   | ✅      | ✅  | ✅
 * AI Value Lookup         | ❌   | ✅      | ✅  | ✅
 * Bulk Tobacco Update     | ❌   | ✅      | ✅  | ✅
 * 
 * AI Tools - Analytics:
 * ---------------------
 * Feature                  | Free | Premium | Pro | Legacy Premium
 * ------------------------|------|---------|-----|---------------
 * Pairing Matrix (Basic)  | ❌   | ✅      | ✅  | ✅
 * Pairing Matrix (Adv)    | ❌   | ❌      | ✅  | ✅
 * Collection Optimization | ❌   | ❌      | ✅  | ✅
 * Break-in Schedules      | ❌   | ❌      | ✅  | ✅
 * Specialization Recs     | ❌   | ❌      | ✅  | ✅
 * Analytics Insights      | ❌   | ❌      | ✅  | ✅
 * 
 * Reports & Export:
 * -----------------
 * Feature                  | Free | Premium | Pro | Legacy Premium
 * ------------------------|------|---------|-----|---------------
 * Export Reports          | ❌   | ❌      | ✅  | ✅
 * Aging Reports           | ❌   | ❌      | ✅  | ✅
 * Smoking Log Reports     | ❌   | ❌      | ✅  | ✅
 * Collection Reports      | ❌   | ❌      | ✅  | ✅
 */

/**
 * FEATURE KEYS
 * ============
 * Use these keys with entitlements.canUse(featureKey)
 */
export const FEATURE_KEYS = {
  // Identification features (Premium+)
  AI_IDENTIFY: 'AI_IDENTIFY',
  AI_VALUE_LOOKUP: 'AI_VALUE_LOOKUP',
  BULK_EDIT: 'BULK_EDIT',
  
  // Basic analytics (Premium+)
  PAIRING_BASIC: 'PAIRING_BASIC',
  
  // Advanced analytics (Pro+)
  PAIRING_ADVANCED: 'PAIRING_ADVANCED',
  COLLECTION_OPTIMIZATION: 'COLLECTION_OPTIMIZATION',
  BREAK_IN_SCHEDULE: 'BREAK_IN_SCHEDULE',
  ANALYTICS_INSIGHTS: 'ANALYTICS_INSIGHTS',
  
  // Reports (Pro+)
  EXPORT_REPORTS: 'EXPORT_REPORTS',
};

/**
 * RESOURCE LIMITS BY TIER
 * ========================
 */
export const TIER_LIMITS = {
  free: {
    pipes: 3,
    tobaccos: 10,
    smokingLogs: 10,
    photosPerItem: 1,
  },
  premium: {
    pipes: Infinity,
    tobaccos: Infinity,
    smokingLogs: Infinity,
    photosPerItem: Infinity,
  },
  pro: {
    pipes: Infinity,
    tobaccos: Infinity,
    smokingLogs: Infinity,
    photosPerItem: Infinity,
  },
  // Legacy Premium uses Pro limits
  premiumLegacy: {
    pipes: Infinity,
    tobaccos: Infinity,
    smokingLogs: Infinity,
    photosPerItem: Infinity,
  },
};

/**
 * ENFORCEMENT POINTS
 * ==================
 * 
 * Frontend (UI Gating):
 * ---------------------
 * - PipeForm.jsx: Check pipes limit before create
 * - TobaccoForm.jsx: Check tobaccos limit before create
 * - Photo uploads: Check photosPerItem limit
 * - SmokingLogPanel.jsx: Check smokingLogs limit before create
 * - AI Components: Show upgrade prompt if feature not available
 * 
 * Backend (Server Enforcement):
 * -----------------------------
 * - generateAgingReportPDF.js: Requires EXPORT_REPORTS
 * - generateAgingReportExcel.js: Requires EXPORT_REPORTS
 * - generateSmokingLogPDF.js: Requires EXPORT_REPORTS
 * - generateSmokingLogExcel.js: Requires EXPORT_REPORTS
 * - getUserReport.js: Admin only
 * - getSpecializationRecommendation.js: Requires PAIRING_ADVANCED
 */

/**
 * USAGE EXAMPLES
 * ==============
 * 
 * Frontend Check:
 * ---------------
 * import { useEntitlements } from "@/components/hooks/useEntitlements";
 * 
 * function MyComponent() {
 *   const entitlements = useEntitlements();
 *   
 *   if (entitlements.tier === "free") {
 *     return <UpgradePrompt />;
 *   }
 *   
 *   if (!entitlements.canUse("AI_IDENTIFY")) {
 *     return <UpgradePrompt featureName="AI Photo Identification" />;
 *   }
 *   
 *   return <MyFeature />;
 * }
 * 
 * Backend Check:
 * --------------
 * import { requireEntitlement } from './_auth/requireEntitlement.js';
 * 
 * Deno.serve(async (req) => {
 *   const base44 = createClientFromRequest(req);
 *   const user = await base44.auth.me();
 *   
 *   await requireEntitlement(base44, user, 'EXPORT_REPORTS');
 *   // Throws 402 if not entitled
 *   
 *   // Continue with feature...
 * });
 */

/**
 * MIGRATION & BACKFILLING
 * ========================
 * 
 * Backfill Existing Users as Premium Legacy:
 * ------------------------------------------
 * Call functions/backfillSubscriptionStartedAt (admin only)
 * Sets started_at to 2024-12-31 for all active subscriptions
 * 
 * Deprecation Path:
 * -----------------
 * - hasPremiumAccess() → Use useEntitlements().canUse(feature)
 * - hasPaidAccess() → Use useEntitlements().tier !== "free"
 * - Direct subscription checks → Use centralized entitlement system
 */