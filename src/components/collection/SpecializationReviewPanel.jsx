import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { buildSpecializationReview } from '@/lib/curator/specializationReview';
import { applySpecializationChange, specializationLabel } from '@/lib/collection/specialization';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

const CONFIDENCE_STYLE = {
  high: { background: 'rgba(46,125,92,0.18)', color: '#8FD3B4', border: '1px solid rgba(46,125,92,0.4)' },
  medium: { background: 'rgba(198,161,91,0.16)', color: '#E4C88A', border: '1px solid rgba(198,161,91,0.35)' },
  low: { background: 'rgba(255,255,255,0.05)', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(255,255,255,0.1)' },
};

/**
 * Descriptive specialization review for one pipe.
 *
 * Explains the candidate classifications, the recorded pipe characteristics
 * behind each one and how much session evidence supports it. It deliberately
 * does not read pairing scores. A change is only written after the collector
 * confirms it, and it lands in the pipe's specialization history.
 */
export default function SpecializationReviewPanel({ pipe, blends = [], smokingLogs = [], onApplied }) {
  const { user } = useCurrentUser();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const review = useMemo(
    () => buildSpecializationReview({ pipe, smokingLogs, blends }),
    [pipe, smokingLogs, blends],
  );

  const applyProposal = async () => {
    setSaving(true);
    try {
      const result = await applySpecializationChange({
        pipe,
        next: review.proposed.focus,
        note: `Curator review, confidence ${review.proposed.confidence}`,
        actorEmail: user?.email,
        source: 'curator_review',
      });
      setConfirming(false);
      toast.success(`Specialization set to ${specializationLabel(review.proposed.focus[0])}`, {
        description: result.recorded ? 'The change was added to this pipe\'s history.' : undefined,
      });
      if (onApplied) onApplied(review.proposed.focus);
    } catch (error) {
      toast.error(error?.message || 'Could not change the specialization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
        <span className="text-sm font-semibold" style={{ color: '#E0D8C8' }}>Curator specialization review</span>
      </div>

      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
        Based on {review.evidence.sessionCount} logged session{review.evidence.sessionCount === 1 ? '' : 's'} with this pipe and its recorded characteristics. No pairing scores are used here.
      </p>

      {review.characteristics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.characteristics.map((row) => (
            <Badge key={row.label} variant="outline" className="text-[11px]" style={{ borderColor: 'rgba(180,140,75,0.3)', color: 'rgba(224,216,200,0.8)' }}>
              {row.label}: {row.value}
            </Badge>
          ))}
        </div>
      )}

      {review.alternatives.length === 0 ? (
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
          Not enough recorded information yet to suggest an alternative. Add pipe characteristics or log sessions with this pipe.
        </p>
      ) : (
        <ul className="space-y-3">
          {review.alternatives.map((alt) => (
            <li key={alt.classification} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{specializationLabel(alt.classification)}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={CONFIDENCE_STYLE[alt.confidence]}>
                  {alt.confidence} confidence
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(224,216,200,0.45)' }}>{alt.basis}</span>
              </div>
              <p className="text-sm mt-1.5 break-words" style={{ color: 'rgba(224,216,200,0.78)' }}>{alt.rationale}</p>
            </li>
          ))}
        </ul>
      )}

      {review.proposed && (
        <div className="pt-1">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm" style={{ color: '#E4C88A' }}>
                Set this pipe's specialization to {specializationLabel(review.proposed.focus[0])}?
              </span>
              <Button size="sm" onClick={applyProposal} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
              Apply {specializationLabel(review.proposed.focus[0])}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}