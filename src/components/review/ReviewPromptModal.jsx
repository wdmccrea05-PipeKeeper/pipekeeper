/**
 * ReviewPromptModal
 *
 * Premium soft-ask modal shown before attempting the App Store review request.
 * Follows Apple's guidelines: the user chooses voluntarily; no rewards, no gates.
 *
 * Three paths:
 * - "Yes, I'll rate it"  → attempt native StoreKit, fallback to App Store URL
 * - "Send Feedback"      → open FeedbackModal, suppress review prompt
 * - "Not Now"            → dismiss cleanly, apply 30-day cooldown
 */

import React from 'react';
import { Star, MessageSquare, X } from 'lucide-react';
import {
  requestNativeReview,
  openAppStoreReviewURL,
} from './reviewEligibility';
import {
  trackReviewPromptShown,
  trackReviewPromptAccept,
  trackReviewPromptDismiss,
  trackReviewPromptFeedback,
  trackNativeReviewRequested,
  trackAppStoreReviewURLOpened,
} from './reviewAnalytics';
import { useTranslation } from '@/components/i18n/safeTranslation';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onFeedback - callback to open FeedbackModal
 * @param {Object} [props.reviewContext] - { reviewStateId, analyticsCtx }
 * @param {Function} [props.onStateUpdate] - async (id, data) => void
 */
export default function ReviewPromptModal({
  isOpen,
  onClose,
  onFeedback,
  reviewContext,
  onStateUpdate,
}) {
  const { t } = useTranslation();
  const analyticsCtx = reviewContext?.analyticsCtx || {};
  const reviewStateId = reviewContext?.reviewStateId;

  // Track impression once on open
  React.useEffect(() => {
    if (isOpen) trackReviewPromptShown(analyticsCtx);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = async () => {
    trackReviewPromptAccept(analyticsCtx);

    // Attempt native StoreKit first
    const nativeOk = requestNativeReview();
    if (nativeOk) {
      trackNativeReviewRequested(analyticsCtx);
    } else {
      // Fallback: open App Store write-review URL
      openAppStoreReviewURL();
      trackAppStoreReviewURLOpened(analyticsCtx);
    }

    // Persist: mark as completed — suppress long-term
    if (reviewStateId && onStateUpdate) {
      await onStateUpdate(reviewStateId, {
        has_completed_review_flow: true,
        last_review_ask_at: new Date().toISOString(),
        total_review_asks: (reviewContext?.analyticsCtx?.total_review_asks || 0) + 1,
        last_positive_moment_type: reviewContext?.triggerMoment || null,
        last_prompt_variant: analyticsCtx?.module || null,
      });
    }

    onClose();
  };

  const handleFeedback = async () => {
    trackReviewPromptFeedback(analyticsCtx);

    // Record that the user took the feedback path — apply 45-day cooldown
    if (reviewStateId && onStateUpdate) {
      await onStateUpdate(reviewStateId, {
        review_feedback_submitted_at: new Date().toISOString(),
        last_review_ask_at: new Date().toISOString(),
        last_prompt_variant: analyticsCtx?.module || null,
      });
    }

    onClose();
    if (onFeedback) onFeedback();
  };

  const handleDismiss = async () => {
    trackReviewPromptDismiss(analyticsCtx);

    // 30-day cooldown on dismissal
    if (reviewStateId && onStateUpdate) {
      await onStateUpdate(reviewStateId, {
        review_prompt_dismissed_at: new Date().toISOString(),
        last_review_ask_at: new Date().toISOString(),
        total_review_asks: (reviewContext?.analyticsCtx?.total_review_asks || 0) + 1,
        last_prompt_variant: analyticsCtx?.module || null,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9900] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(44,30,20,0.98), rgba(26,18,12,1))',
          border: '1px solid rgba(180,140,75,0.32)',
          boxShadow: '0 28px 64px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(180,140,75,0.85) 50%, transparent 100%)',
          }}
        />

        <div className="p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(180,140,75,0.16)', border: '1px solid rgba(180,140,75,0.32)' }}
              >
                <Star className="w-6 h-6" style={{ color: '#D4A574' }} fill="rgba(212,165,116,0.4)" />
              </div>
              <div>
                <h2
                  className="text-xl font-bold leading-tight"
                  style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
                >
                  {t("auto.components_review_ReviewPromptModal.enjoying_collectionkeeper_1yra1a")}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl transition-all hover:bg-white/10"
              aria-label={t("auto.components_review_ReviewPromptModal.dismiss_w1upy9")}
            >
              <X className="w-4 h-4" style={{ color: 'rgba(224,216,200,0.5)' }} />
            </button>
          </div>

          {/* Body */}
          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>
            {t("auto.components_review_ReviewPromptModal.if_collectionkeeper_has_made_your_collection_8fy631")}
          </p>

          {/* Star decoration */}
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="w-6 h-6"
                style={{ color: '#D4A574' }}
                fill="rgba(212,165,116,0.9)"
              />
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAccept}
              className="w-full py-3.5 rounded-2xl text-[15px] font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
                color: '#F5F1E7',
                border: '1px solid rgba(163,92,92,0.5)',
                boxShadow: '0 4px 16px rgba(163,92,92,0.28)',
              }}
            >
              {t("auto.components_review_ReviewPromptModal.yes_i_ll_rate_it_66uapv")}
            </button>

            <button
              type="button"
              onClick={handleFeedback}
              className="w-full py-3 rounded-2xl text-[14px] font-medium flex items-center justify-center gap-2 transition-all hover:bg-white/8"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(224,216,200,0.82)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              {t("auto.components_review_ReviewPromptModal.send_feedback_1ncyto")}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-2xl text-sm transition-all hover:bg-white/5"
              style={{ color: 'rgba(224,216,200,0.42)' }}
            >
              {t("auto.components_review_ReviewPromptModal.not_now_10efa5")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}