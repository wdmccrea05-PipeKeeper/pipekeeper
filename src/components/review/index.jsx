/**
 * Review Acquisition Flow — Barrel Export
 *
 * Primary integration points for consuming modules:
 *
 * 1. useReviewTrigger() hook — call after positive events
 * 2. ReviewPromptModal + FeedbackModal — render in your page/module
 * 3. POSITIVE_TRIGGERS — constants for trigger moment types
 * 4. FRUSTRATION_EVENTS — constants for recording frustration events
 *
 * Example integration in a module page:
 *
 *   import { useReviewTrigger, POSITIVE_TRIGGERS, ReviewPromptModal, FeedbackModal } from '@/components/review';
 *
 *   const {
 *     triggerReviewCheck,
 *     incrementRecordCount,
 *     incrementLogCount,
 *     recordFrustrationEvent,
 *     showReviewModal, setShowReviewModal,
 *     showFeedbackModal, setShowFeedbackModal,
 *     reviewContext, updateReviewState,
 *   } = useReviewTrigger({ module: 'pipekeeper' });
 *
 *   // After successfully adding a pipe:
 *   await incrementRecordCount();
 *   await triggerReviewCheck({ triggerMoment: POSITIVE_TRIGGERS.PIPE_ADDED });
 *
 *   // After a frustration event:
 *   await recordFrustrationEvent(FRUSTRATION_EVENTS.SYNC_FAILED);
 *
 *   // In JSX:
 *   <ReviewPromptModal
 *     isOpen={showReviewModal}
 *     onClose={() => setShowReviewModal(false)}
 *     onFeedback={() => setShowFeedbackModal(true)}
 *     reviewContext={reviewContext}
 *     onStateUpdate={updateReviewState}
 *   />
 *   <FeedbackModal
 *     isOpen={showFeedbackModal}
 *     onClose={() => setShowFeedbackModal(false)}
 *     reviewContext={reviewContext}
 *     onStateUpdate={updateReviewState}
 *   />
 */

export { useReviewTrigger } from './useReviewTrigger';
export { default as ReviewPromptModal } from './ReviewPromptModal';
export { default as FeedbackModal } from './FeedbackModal';
export {
  resolveReviewEligibility,
  requestNativeReview,
  openAppStoreReviewURL,
  isIOSDevice,
  isNativeIOSApp,
  POSITIVE_TRIGGERS,
  FRUSTRATION_EVENTS,
  COOLDOWNS,
  THRESHOLDS,
  APP_STORE_REVIEW_URL,
  APP_STORE_ID,
} from './reviewEligibility';
export {
  trackReviewPromptEligible,
  trackReviewPromptShown,
  trackReviewPromptAccept,
  trackReviewPromptDismiss,
  trackReviewPromptFeedback,
  trackNativeReviewRequested,
  trackAppStoreReviewURLOpened,
  trackFeedbackSubmitted,
  trackTestimonialRequestEligible,
} from './reviewAnalytics';