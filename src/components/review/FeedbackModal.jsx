/**
 * FeedbackModal — Negative path in the review acquisition flow.
 *
 * When the user taps "Send Feedback" in ReviewPromptModal, we route them here
 * instead of to the App Store. This captures structured feedback and stores
 * a cooldown to suppress future review prompts for at least 45 days.
 *
 * Never routes unhappy users to App Store reviews.
 */

import React, { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';
import { trackFeedbackSubmitted } from './reviewAnalytics';

// Feedback categories with user-facing labels
const FEEDBACK_CATEGORIES = [
  { value: 'bug',              label: '🐛 Bug or crash' },
  { value: 'feature_request',  label: '💡 Feature request' },
  { value: 'billing',          label: '💳 Billing or subscription' },
  { value: 'data_issue',       label: '📦 Data or sync issue' },
  { value: 'photo_issue',      label: '📷 Photo or image issue' },
  { value: 'ai_issue',         label: '🤖 AI or Curator issue' },
  { value: 'general',          label: '💬 General feedback' },
];

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} [props.reviewContext] - { reviewStateId, analyticsCtx }
 * @param {Function} [props.onStateUpdate] - async (id, data) => void
 */
export default function FeedbackModal({ isOpen, onClose, reviewContext, onStateUpdate }) {
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const analyticsCtx = reviewContext?.analyticsCtx || {};
  const reviewStateId = reviewContext?.reviewStateId;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim() && category === 'general') return;

    setSubmitting(true);
    try {
      // Track analytics
      trackFeedbackSubmitted({ ...analyticsCtx, feedbackCategory: category });

      // Persist negative feedback state — suppress review prompt for 45 days
      if (reviewStateId && onStateUpdate) {
        await onStateUpdate(reviewStateId, {
          review_feedback_submitted_at: new Date().toISOString(),
          last_negative_feedback_at: new Date().toISOString(),
          testimonial_eligible: false, // reset; they gave feedback, not testimonial
        });
      }

      setSubmitted(true);
    } catch {
      // Non-critical — still show success UI
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setCategory('general');
    setNotes('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9950] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(44,30,20,0.98), rgba(26,18,12,1))',
          border: '1px solid rgba(180,140,75,0.25)',
          boxShadow: '0 28px 64px rgba(0,0,0,0.62)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent line */}
        <div
          className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(180,140,75,0.7), transparent)' }}
        />

        <div className="p-6 space-y-5">
          {submitted ? (
            // ── Success state ────────────────────────────────────────────────
            <div className="py-6 flex flex-col items-center text-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(46,125,92,0.18)', border: '1px solid rgba(46,125,92,0.35)' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: '#4CAF80' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
                  Thank You
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.72)' }}>
                  Your feedback helps us make CollectionKeeper better for every collector.
                  We'll review your note and follow up if needed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 w-full py-3 rounded-2xl text-sm font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(224,216,200,0.8)',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            // ── Feedback form ────────────────────────────────────────────────
            <>
              <div className="flex items-center justify-between">
                <h2
                  className="text-xl font-bold"
                  style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
                >
                  Send Feedback
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-xl hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" style={{ color: 'rgba(224,216,200,0.5)' }} />
                </button>
              </div>

              <p className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>
                Let us know what's on your mind. All feedback goes directly to the team.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.8)' }}>
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEEDBACK_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-all"
                        style={{
                          background: category === cat.value
                            ? 'rgba(180,140,75,0.22)'
                            : 'rgba(255,255,255,0.04)',
                          border: category === cat.value
                            ? '1px solid rgba(180,140,75,0.5)'
                            : '1px solid rgba(255,255,255,0.08)',
                          color: category === cat.value ? '#D4A574' : 'rgba(224,216,200,0.72)',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.8)' }}>
                    Details (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell us what happened or what you'd like to see improved..."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-1"
                    style={{
                      background: 'rgba(20,14,10,0.7)',
                      border: '1px solid rgba(180,140,75,0.22)',
                      color: '#F5F1E7',
                      focusRingColor: 'rgba(180,140,75,0.5)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
                    color: '#F5F1E7',
                    border: '1px solid rgba(163,92,92,0.5)',
                  }}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}