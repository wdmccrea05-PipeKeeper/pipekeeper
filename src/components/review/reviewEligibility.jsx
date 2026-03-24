/**
 * Review Eligibility Resolver
 * Centralized logic for determining whether the App Store review soft-ask
 * prompt (or testimonial flow for web users) should be shown.
 *
 * APPLE POLICY COMPLIANCE:
 * - Payment method does NOT determine review eligibility.
 * - Apple and Stripe subscribers are treated identically.
 * - Web-only users are excluded from App Store prompts (no iOS app).
 * - We never gate features, reward reviews, or guarantee reviews.
 * - We only ask after positive product moments.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** App Store link for CollectionKeeper. Replace APP_STORE_ID with live ID. */
export const APP_STORE_ID = '6740343399'; // CollectionKeeper App Store ID
export const APP_STORE_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

// Cooldown periods in milliseconds
export const COOLDOWNS = {
  /** After "Not Now" dismissal — 30 days */
  DISMISSED_MS: 30 * 24 * 60 * 60 * 1000,
  /** After "Send Feedback" — 45 days minimum */
  FEEDBACK_SUBMITTED_MS: 45 * 24 * 60 * 60 * 1000,
  /** After any review ask (regardless of outcome) — 30 days */
  LAST_ASK_MS: 30 * 24 * 60 * 60 * 1000,
  /** After a frustration event (error, failed sync, etc.) — 7 days */
  FRUSTRATION_MS: 7 * 24 * 60 * 60 * 1000,
  /** After negative feedback submission — 30 days */
  NEGATIVE_FEEDBACK_MS: 30 * 24 * 60 * 60 * 1000,
};

// Engagement thresholds to qualify for review ask
export const THRESHOLDS = {
  /** Minimum days since account creation */
  MIN_DAYS_SINCE_SIGNUP: 7,
  /** Minimum meaningful sessions / app opens */
  MIN_SESSIONS: 5,
  /** Minimum records created OR logs completed (OR condition) */
  MIN_RECORDS_OR_LOGS: 3,
};

// ─── Platform detection ──────────────────────────────────────────────────────

/**
 * Returns true if the current browser/device appears to be iOS.
 * This detects iPhone, iPad, and iPod (including newer iPads via maxTouchPoints).
 */
export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Returns true if the app is running inside a native iOS WebView shell.
 * Checks for a custom bridge injected by the native wrapper.
 */
export function isNativeIOSApp() {
  if (typeof window === 'undefined') return false;
  // Our native shell injects window.__nativeReview or window.__native
  return !!(window.__nativeReview || window.__native || window.__nativeIAP);
}

/**
 * Attempts to invoke the native StoreKit in-app review prompt.
 * Returns true if the native call was dispatched, false otherwise.
 */
export function requestNativeReview() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__nativeReview?.requestReview) {
      window.__nativeReview.requestReview();
      return true;
    }
    // Alternative bridge patterns used by common React Native / WebView wrappers
    if (window.webkit?.messageHandlers?.requestReview) {
      window.webkit.messageHandlers.requestReview.postMessage({});
      return true;
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_REVIEW' }));
      return true;
    }
  } catch {
    // Native bridge unavailable — fall through
  }
  return false;
}

/**
 * Opens the App Store write-review URL as a fallback when native StoreKit
 * is unavailable or suppressed.
 */
export function openAppStoreReviewURL() {
  try {
    window.open(APP_STORE_REVIEW_URL, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}

// ─── Eligibility resolver ────────────────────────────────────────────────────

/**
 * @typedef {Object} ReviewStateData
 * @property {string|null} last_review_ask_at
 * @property {string|null} review_prompt_dismissed_at
 * @property {string|null} review_feedback_submitted_at
 * @property {boolean} has_completed_review_flow
 * @property {string|null} last_frustration_event_at
 * @property {string|null} last_negative_feedback_at
 * @property {boolean} is_ios_active_user
 * @property {boolean} testimonial_eligible
 * @property {number} session_count
 * @property {number} records_created_count
 * @property {number} logs_completed_count
 */

/**
 * @typedef {Object} EligibilityContext
 * @property {ReviewStateData|null} reviewState
 * @property {string|null} signupDate - ISO date string from user.created_date
 * @property {string|null} subscriptionProvider - 'apple' | 'stripe' | null
 * @property {boolean} hasPaidAccess
 * @property {boolean} isOnboarding - true if currently in onboarding flow
 * @property {boolean} isCheckout - true if currently in checkout/payment flow
 * @property {boolean} isEditing - true if user is mid-edit
 */

/**
 * @typedef {Object} EligibilityResult
 * @property {boolean} eligible
 * @property {'app_store_review'|'testimonial'|null} promptType
 * @property {string} reason - human-readable reason for debug/logging
 * @property {boolean} iosUser
 */

/**
 * Pure eligibility resolver. Takes all required context and returns
 * whether the review prompt should be shown and what type.
 *
 * @param {EligibilityContext} ctx
 * @returns {EligibilityResult}
 */
export function resolveReviewEligibility(ctx) {
  const {
    reviewState,
    signupDate,
    subscriptionProvider,
    hasPaidAccess,
    isOnboarding = false,
    isCheckout = false,
    isEditing = false,
  } = ctx;

  const iosDevice = isIOSDevice();
  const nativeApp = isNativeIOSApp();
  // An "iOS active user" is one currently on iOS OR previously detected (persisted flag)
  const iosUser = iosDevice || nativeApp || (reviewState?.is_ios_active_user === true);

  // ── Never show during disruptive workflows ────────────────────────────────
  if (isOnboarding) return ineligible('user is in onboarding', iosUser);
  if (isCheckout)   return ineligible('user is in checkout/paywall', iosUser);
  if (isEditing)    return ineligible('user is mid-edit', iosUser);

  const now = Date.now();

  // ── Already accepted the review path — suppress long-term ─────────────────
  if (reviewState?.has_completed_review_flow) {
    return ineligible('user already completed review flow', iosUser);
  }

  // ── Cooldown: too soon since last ask ─────────────────────────────────────
  if (reviewState?.last_review_ask_at) {
    const lastAsk = new Date(reviewState.last_review_ask_at).getTime();
    if (now - lastAsk < COOLDOWNS.LAST_ASK_MS) {
      return ineligible('review ask cooldown active (30 days)', iosUser);
    }
  }

  // ── Cooldown: recent dismissal ────────────────────────────────────────────
  if (reviewState?.review_prompt_dismissed_at) {
    const dismissed = new Date(reviewState.review_prompt_dismissed_at).getTime();
    if (now - dismissed < COOLDOWNS.DISMISSED_MS) {
      return ineligible('dismissed cooldown active (30 days)', iosUser);
    }
  }

  // ── Cooldown: feedback submitted ──────────────────────────────────────────
  if (reviewState?.review_feedback_submitted_at) {
    const feedbackAt = new Date(reviewState.review_feedback_submitted_at).getTime();
    if (now - feedbackAt < COOLDOWNS.FEEDBACK_SUBMITTED_MS) {
      return ineligible('feedback cooldown active (45 days)', iosUser);
    }
  }

  // ── Cooldown: recent frustration event ───────────────────────────────────
  if (reviewState?.last_frustration_event_at) {
    const frustAt = new Date(reviewState.last_frustration_event_at).getTime();
    if (now - frustAt < COOLDOWNS.FRUSTRATION_MS) {
      return ineligible('frustration event cooldown active (7 days)', iosUser);
    }
  }

  // ── Cooldown: recent negative feedback ───────────────────────────────────
  if (reviewState?.last_negative_feedback_at) {
    const negAt = new Date(reviewState.last_negative_feedback_at).getTime();
    if (now - negAt < COOLDOWNS.NEGATIVE_FEEDBACK_MS) {
      return ineligible('negative feedback cooldown active (30 days)', iosUser);
    }
  }

  // ── Signup age threshold ──────────────────────────────────────────────────
  if (signupDate) {
    const daysSinceSignup = (now - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup < THRESHOLDS.MIN_DAYS_SINCE_SIGNUP) {
      return ineligible(`account too new (${Math.floor(daysSinceSignup)} days)`, iosUser);
    }
  }

  // ── Engagement thresholds ─────────────────────────────────────────────────
  const sessions = reviewState?.session_count || 0;
  const records = reviewState?.records_created_count || 0;
  const logs = reviewState?.logs_completed_count || 0;

  if (sessions < THRESHOLDS.MIN_SESSIONS) {
    return ineligible(`insufficient sessions (${sessions}/${THRESHOLDS.MIN_SESSIONS})`, iosUser);
  }
  if (records < THRESHOLDS.MIN_RECORDS_OR_LOGS && logs < THRESHOLDS.MIN_RECORDS_OR_LOGS) {
    return ineligible(`insufficient records/logs (${records} records, ${logs} logs)`, iosUser);
  }

  // ── Routing: iOS vs web ───────────────────────────────────────────────────
  // Apple policy: only ask for App Store review from iOS users.
  // Web-only Stripe users should receive testimonial flow instead.
  if (iosUser) {
    // Apple and Stripe subscribers on iOS are treated identically.
    // Free users with strong engagement also qualify.
    return {
      eligible: true,
      promptType: 'app_store_review',
      reason: `eligible: iOS user, sessions=${sessions}, records=${records}, logs=${logs}`,
      iosUser: true,
    };
  }

  // Web user — if they have meaningful engagement, mark for testimonial
  if (records >= THRESHOLDS.MIN_RECORDS_OR_LOGS || logs >= THRESHOLDS.MIN_RECORDS_OR_LOGS) {
    return {
      eligible: true,
      promptType: 'testimonial',
      reason: `web user eligible for testimonial, records=${records}, logs=${logs}`,
      iosUser: false,
    };
  }

  return ineligible('web user with insufficient engagement', iosUser);
}

/** Helper to build a clean ineligible result */
function ineligible(reason, iosUser) {
  return { eligible: false, promptType: null, reason, iosUser };
}

// ─── Positive trigger events ──────────────────────────────────────────────────

/**
 * Canonical list of positive trigger moment types.
 * Use these constants when calling `triggerReviewCheck` to ensure
 * consistent analytics and logging.
 */
export const POSITIVE_TRIGGERS = {
  PIPE_ADDED:          'pipe_added',
  BOTTLE_ADDED:        'bottle_added',
  BLEND_ADDED:         'blend_added',
  CIGAR_ADDED:         'cigar_added',
  SESSION_LOGGED:      'session_logged',
  TASTING_LOGGED:      'tasting_logged',
  SYNC_COMPLETED:      'sync_completed',
  IMPORT_COMPLETED:    'import_completed',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  MODULE_UNLOCKED:     'module_unlocked',
  AI_FEATURE_USED:     'ai_feature_used',
  COLLECTION_MILESTONE: 'collection_milestone',
  BREAK_IN_COMPLETED:  'break_in_completed',
  PAIRING_GENERATED:   'pairing_generated',
};

/**
 * Frustration event types to record when a negative experience occurs.
 * Call `recordFrustrationEvent` when these happen.
 */
export const FRUSTRATION_EVENTS = {
  SYNC_FAILED:           'sync_failed',
  PHOTO_UPLOAD_FAILED:   'photo_upload_failed',
  IMPORT_FAILED:         'import_failed',
  PAYMENT_FAILED:        'payment_failed',
  RESTORE_FAILED:        'restore_failed',
  AI_ERROR:              'ai_error',
  GENERAL_ERROR:         'general_error',
};