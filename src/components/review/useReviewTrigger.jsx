/**
 * useReviewTrigger
 *
 * A React hook that provides a `triggerReviewCheck` function which should be
 * called after any positive product moment (pipe added, session logged, etc.).
 *
 * It loads the user's ReviewState from the database, runs the eligibility
 * resolver, and if eligible, shows the soft-ask modal.
 *
 * Usage:
 *   const { triggerReviewCheck, recordFrustrationEvent, incrementRecordCount, incrementLogCount } = useReviewTrigger({ module: 'pipekeeper' });
 *   // After successfully adding a pipe:
 *   await triggerReviewCheck({ triggerMoment: POSITIVE_TRIGGERS.PIPE_ADDED });
 */

import { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import {
  resolveReviewEligibility,
  isIOSDevice,
  isNativeIOSApp,
} from './reviewEligibility';
import {
  trackReviewPromptEligible,
  trackTestimonialRequestEligible,
} from './reviewAnalytics';

/**
 * @param {Object} options
 * @param {string} [options.module] - module context for analytics
 */
export function useReviewTrigger({ module: moduleName = 'unknown' } = {}) {
  const { user, subscription, tier: entitlementTier } = useCurrentUser();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [reviewContext, setReviewContext] = useState(null);

  // Prevent double-triggering in a single render cycle
  const checkInProgress = useRef(false);

  /**
   * Load or create the ReviewState record for the current user.
   * Returns the record, or null on failure.
   */
  const loadReviewState = useCallback(async () => {
    if (!user?.email) return null;
    try {
      const results = await base44.entities.ReviewState.filter({ user_email: user.email });
      if (results && results.length > 0) return results[0];

      // No record yet — create a baseline one
      const created = await base44.entities.ReviewState.create({
        user_email: user.email,
        is_ios_active_user: isIOSDevice() || isNativeIOSApp(),
        session_count: 1,
        records_created_count: 0,
        logs_completed_count: 0,
      });
      return created;
    } catch {
      return null;
    }
  }, [user?.email]);

  /**
   * Persist a partial update to the ReviewState record.
   */
  const updateReviewState = useCallback(async (recordId, data) => {
    if (!recordId) return;
    try {
      await base44.entities.ReviewState.update(recordId, data);
    } catch {
      // Non-critical — fail silently
    }
  }, []);

  /**
   * Main entry point. Call this after any positive product moment.
   * @param {Object} opts
   * @param {string} opts.triggerMoment - one of POSITIVE_TRIGGERS values
   */
  const triggerReviewCheck = useCallback(async ({ triggerMoment } = {}) => {
    if (!user?.email || checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      const reviewState = await loadReviewState();

      const ctx = {
        reviewState,
        signupDate: user?.created_date || null,
        subscriptionProvider: subscription?.provider || null,
        hasPaidAccess: !!subscription,
        isOnboarding: false,
        isCheckout: false,
        isEditing: false,
      };

      const result = resolveReviewEligibility(ctx);

      const analyticsCtx = {
        module: moduleName,
        subscriptionSource: subscription?.provider || 'none',
        entitlementTier: entitlementTier || 'free',
        triggerMoment,
        promptType: result.promptType,
        iosUser: result.iosUser,
      };

      if (!result.eligible) {
        // Not eligible — nothing to show
        return;
      }

      if (result.promptType === 'testimonial') {
        // Web user — mark eligible for testimonial flow (no modal here)
        trackTestimonialRequestEligible(analyticsCtx);
        if (reviewState?.id) {
          await updateReviewState(reviewState.id, { testimonial_eligible: true });
        }
        return;
      }

      // App Store review prompt eligible
      trackReviewPromptEligible(analyticsCtx);

      setReviewContext({
        reviewStateId: reviewState?.id,
        analyticsCtx,
        triggerMoment,
      });
      setShowReviewModal(true);
    } finally {
      checkInProgress.current = false;
    }
  }, [user, subscription, entitlementTier, moduleName, loadReviewState, updateReviewState]);

  /**
   * Call this when a frustration event occurs (error, failed sync, etc.)
   * to suppress the review prompt for a cooldown period.
   * @param {string} [eventType] - one of FRUSTRATION_EVENTS values
   */
  const recordFrustrationEvent = useCallback(async (eventType = 'general_error') => {
    if (!user?.email) return;
    try {
      const reviewState = await loadReviewState();
      if (reviewState?.id) {
        await updateReviewState(reviewState.id, {
          last_frustration_event_at: new Date().toISOString(),
        });
      }
    } catch {
      // Non-critical
    }
  }, [user?.email, loadReviewState, updateReviewState]);

  /**
   * Increment the records_created_count for eligibility tracking.
   * Call after any entity creation (pipe, bottle, blend, etc.).
   */
  const incrementRecordCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const reviewState = await loadReviewState();
      if (reviewState?.id) {
        await updateReviewState(reviewState.id, {
          records_created_count: (reviewState.records_created_count || 0) + 1,
          is_ios_active_user: reviewState.is_ios_active_user || isIOSDevice() || isNativeIOSApp(),
        });
      }
    } catch {
      // Non-critical
    }
  }, [user?.email, loadReviewState, updateReviewState]);

  /**
   * Increment the logs_completed_count for eligibility tracking.
   * Call after any log completion (smoking session, tasting, etc.).
   */
  const incrementLogCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const reviewState = await loadReviewState();
      if (reviewState?.id) {
        await updateReviewState(reviewState.id, {
          logs_completed_count: (reviewState.logs_completed_count || 0) + 1,
          last_session_at: new Date().toISOString(),
          session_count: (reviewState.session_count || 0) + 1,
          is_ios_active_user: reviewState.is_ios_active_user || isIOSDevice() || isNativeIOSApp(),
        });
      }
    } catch {
      // Non-critical
    }
  }, [user?.email, loadReviewState, updateReviewState]);

  /**
   * Record a new app session open (increment session_count and update iOS flag).
   * Call once per meaningful app open, not per page navigation.
   */
  const recordSessionOpen = useCallback(async () => {
    if (!user?.email) return;
    try {
      const reviewState = await loadReviewState();
      if (reviewState?.id) {
        await updateReviewState(reviewState.id, {
          session_count: (reviewState.session_count || 0) + 1,
          last_session_at: new Date().toISOString(),
          is_ios_active_user: reviewState.is_ios_active_user || isIOSDevice() || isNativeIOSApp(),
        });
      }
    } catch {
      // Non-critical
    }
  }, [user?.email, loadReviewState, updateReviewState]);

  return {
    triggerReviewCheck,
    recordFrustrationEvent,
    incrementRecordCount,
    incrementLogCount,
    recordSessionOpen,
    showReviewModal,
    showFeedbackModal,
    setShowReviewModal,
    setShowFeedbackModal,
    reviewContext,
    updateReviewState,
    loadReviewState,
  };
}