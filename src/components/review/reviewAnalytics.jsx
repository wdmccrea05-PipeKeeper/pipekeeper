/**
 * Review Funnel Analytics
 * Tracks all review prompt events for funnel analysis and conversion measurement.
 * Breaks down by module, platform, entitlement, subscription source, and trigger.
 */

import { base44 } from '@/api/base44Client';

/**
 * Base properties attached to every review analytics event.
 * @param {Object} ctx
 * @param {string} [ctx.module] - e.g. 'pipekeeper', 'whiskeykeeper', 'collectionhub'
 * @param {string} [ctx.subscriptionSource] - 'apple' | 'stripe' | 'none'
 * @param {string} [ctx.entitlementTier] - 'free' | 'premium' | 'pro'
 * @param {string} [ctx.triggerMoment] - POSITIVE_TRIGGERS value
 * @param {string} [ctx.promptType] - 'app_store_review' | 'testimonial'
 * @param {boolean} [ctx.iosUser]
 */
function buildBaseProps(ctx = {}) {
  return {
    module: ctx.module || 'unknown',
    platform: typeof navigator !== 'undefined'
      ? (/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'web')
      : 'unknown',
    subscription_source: ctx.subscriptionSource || 'none',
    entitlement_tier: ctx.entitlementTier || 'free',
    trigger_moment: ctx.triggerMoment || null,
    prompt_type: ctx.promptType || null,
    ios_user: ctx.iosUser === true,
  };
}

/**
 * User crossed all eligibility thresholds — eligible to be shown the prompt.
 */
export function trackReviewPromptEligible(ctx) {
  base44.analytics.track({ eventName: 'review_prompt_eligible', properties: buildBaseProps(ctx) });
}

/**
 * The soft-ask modal was actually shown to the user.
 */
export function trackReviewPromptShown(ctx) {
  base44.analytics.track({ eventName: 'review_prompt_shown', properties: buildBaseProps(ctx) });
}

/**
 * User tapped "Yes, I'll rate it".
 */
export function trackReviewPromptAccept(ctx) {
  base44.analytics.track({ eventName: 'review_prompt_accept', properties: buildBaseProps(ctx) });
}

/**
 * User tapped "Send Feedback".
 */
export function trackReviewPromptFeedback(ctx) {
  base44.analytics.track({ eventName: 'review_prompt_feedback', properties: buildBaseProps(ctx) });
}

/**
 * User tapped "Not Now".
 */
export function trackReviewPromptDismiss(ctx) {
  base44.analytics.track({ eventName: 'review_prompt_dismiss', properties: buildBaseProps(ctx) });
}

/**
 * Native StoreKit in-app review prompt was successfully requested.
 */
export function trackNativeReviewRequested(ctx) {
  base44.analytics.track({ eventName: 'native_review_requested', properties: buildBaseProps(ctx) });
}

/**
 * Fell back to opening the App Store URL directly.
 */
export function trackAppStoreReviewURLOpened(ctx) {
  base44.analytics.track({ eventName: 'app_store_review_url_opened', properties: buildBaseProps(ctx) });
}

/**
 * User submitted in-app feedback via the negative path.
 * @param {Object} ctx
 * @param {string} ctx.feedbackCategory - bug | feature_request | billing | data_issue | photo_issue | ai_issue | general
 */
export function trackFeedbackSubmitted(ctx) {
  base44.analytics.track({
    eventName: 'feedback_submitted',
    properties: {
      ...buildBaseProps(ctx),
      feedback_category: ctx.feedbackCategory || 'general',
    },
  });
}

/**
 * A web-only user has been identified as eligible for a testimonial request.
 */
export function trackTestimonialRequestEligible(ctx) {
  base44.analytics.track({ eventName: 'testimonial_request_eligible', properties: buildBaseProps(ctx) });
}