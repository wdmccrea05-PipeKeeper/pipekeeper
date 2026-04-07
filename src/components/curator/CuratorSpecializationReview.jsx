/**
 * CuratorSpecializationReview
 *
 * Per-pipe specialization review workflow.
 * Shows one pipe at a time: current spec, suggested spec, usage evidence.
 * Actions: Accept / Reject / Ask Curator / Skip
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { applyPipeSpecialization } from '@/lib/curator/recommendationActions.js';

const SPEC_OPTIONS = [
  'Virginia', 'Virginia/Perique', 'Virginia/Burley', 'Virginia/Oriental',
  'English', 'English/Balkan', 'Aromatic', 'Burley', 'Oriental',
  'All-Around', 'Dedicated Meerschaum', 'Estate / Collectible',
];

function ConfidenceBadge({ confidence }) {
  const styles = {
    high:   { bg: 'rgba(46,125,92,0.18)',   text: 'rgba(80,180,130,1)' },
    medium: { bg: 'rgba(180,140,75,0.18)',  text: 'rgba(212,165,116,1)' },
    low:    { bg: 'rgba(139,58,58,0.18)',   text: 'rgba(210,120,120,1)' },
  };
  const s = styles[confidence] || styles.medium;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {confidence} confidence
    </span>
  );
}

/**
 * @param {object}    props
 * @param {object[]}  props.pipeItems     - Items from a specialization recommendation
 * @param {Function}  props.onDone        - Called when review is complete
 * @param {Function}  props.onAskCurator  - Called with a prompt string
 */
export default function CuratorSpecializationReview({ pipeItems = [], onDone, onAskCurator }) {
  const candidates = useMemo(() => pipeItems.filter((p) => p.hasLogData), [pipeItems]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({});    // pipeId → { status, spec }
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [customSpec, setCustomSpec] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const pipe = candidates[index];
  const isLastPipe = index >= candidates.length - 1;
  const doneCount = Object.keys(results).length;

  async function handleAccept() {
    if (!pipe) return;
    const spec = (showCustom && customSpec) ? customSpec : pipe.suggestedSpec;
    if (!spec) return;
    setApplying(true);
    setError(null);
    try {
      await applyPipeSpecialization(pipe.recordId, spec);
      setResults((prev) => ({ ...prev, [pipe.id]: { status: 'accepted', spec } }));
      advanceOrDone();
    } catch (err) {
      setError(err?.message || 'Failed to apply specialization.');
    } finally {
      setApplying(false);
    }
  }

  function handleReject() {
    if (!pipe) return;
    setResults((prev) => ({ ...prev, [pipe.id]: { status: 'rejected' } }));
    advanceOrDone();
  }

  function advanceOrDone() {
    setShowCustom(false);
    setCustomSpec('');
    if (!isLastPipe) {
      setIndex((i) => i + 1);
    } else if (onDone) {
      onDone(results);
    }
  }

  function handleAskCurator() {
    if (!pipe || !onAskCurator) return;
    const rationale = pipe.rationale || '';
    const prompt = `I'm reviewing the suggested specialization for my pipe "${pipe.recordName}". The suggestion is "${pipe.suggestedSpec}" based on ${pipe.sessionCount} sessions with ${pipe.topBlends?.join(', ') || 'various blends'}. ${rationale} Should I accept this specialization or would something else be more appropriate?`;
    onAskCurator(prompt);
  }

  if (!candidates.length) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#4A7C59' }} />
        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>
          No pipes with usage-backed specialization suggestions.
        </p>
      </div>
    );
  }

  if (!pipe || (isLastPipe && results[pipe?.id])) {
    return (
      <div className="py-8 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: '#4A7C59' }} />
        <p className="text-base font-semibold" style={{ color: '#F5F1E7' }}>
          Review Complete
        </p>
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
          {Object.values(results).filter((r) => r.status === 'accepted').length} specialization{Object.values(results).filter((r) => r.status === 'accepted').length !== 1 ? 's' : ''} applied
        </p>
        {onDone && (
          <button
            onClick={() => onDone(results)}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(74,124,92,0.25)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.4)' }}
          >
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.18)' }}
    >
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Pipe {index + 1} of {candidates.length}
        </p>
        <ConfidenceBadge confidence={pipe.confidence} />
      </div>

      {/* Pipe name */}
      <div>
        <p
          className="text-base font-bold leading-tight"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {pipe.recordName}
        </p>
        {pipe.maker && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            by {pipe.maker}
          </p>
        )}
      </div>

      {/* Current → Suggested */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2.5"
          style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(140,105,65,0.12)' }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Current
          </p>
          <p className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {pipe.currentSpec || 'Not set'}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ background: 'rgba(74,124,92,0.1)', border: '1px solid rgba(74,124,92,0.3)' }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(100,180,130,0.6)' }}>
            Suggested
          </p>
          <p className="text-sm font-semibold" style={{ color: 'rgba(100,180,130,1)' }}>
            {pipe.suggestedSpec || '—'}
          </p>
        </div>
      </div>

      {/* Usage evidence */}
      <div
        className="rounded-lg p-2.5"
        style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(140,105,65,0.1)' }}
      >
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(224,216,200,0.35)' }}>
          Usage Evidence
        </p>
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.65)' }}>
          {pipe.rationale}
        </p>
        {pipe.topBlends?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {pipe.topBlends.map((name) => (
              <span
                key={name}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(74,124,92,0.15)', color: 'rgba(100,180,130,0.85)', border: '1px solid rgba(74,124,92,0.25)' }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Custom spec selector */}
      {showCustom && (
        <div>
          <p className="text-xs mb-1.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            Choose a different specialization:
          </p>
          <select
            value={customSpec}
            onChange={(e) => setCustomSpec(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(140,105,65,0.3)',
              color: '#F5F1E7',
            }}
          >
            <option value="">— select —</option>
            {SPEC_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs" style={{ color: 'rgba(210,100,80,1)' }}>{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={applying || (showCustom && !customSpec)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'rgba(74,124,92,0.25)', color: 'rgba(80,180,130,1)', border: '1px solid rgba(74,124,92,0.4)' }}
        >
          <Check className="w-3.5 h-3.5" />
          {applying ? 'Applying…' : showCustom ? 'Apply Custom' : 'Accept'}
        </button>

        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: showCustom ? 'rgba(180,140,75,0.2)' : 'rgba(255,255,255,0.05)',
            color: showCustom ? 'rgba(212,165,116,1)' : 'rgba(224,216,200,0.6)',
            border: showCustom ? '1px solid rgba(180,140,75,0.4)' : '1px solid rgba(140,105,65,0.2)',
          }}
        >
          Change
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={applying}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: 'rgba(139,58,58,0.12)', color: 'rgba(200,120,120,0.9)', border: '1px solid rgba(139,58,58,0.25)' }}
        >
          <X className="w-3.5 h-3.5" />
          Skip
        </button>

        <button
          type="button"
          onClick={handleAskCurator}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ml-auto"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.15)' }}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Ask Curator
        </button>
      </div>

      {/* Navigation */}
      {candidates.length > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 text-xs disabled:opacity-30"
            style={{ color: 'rgba(224,216,200,0.5)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <div className="flex gap-1.5">
            {candidates.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i === index
                    ? 'rgba(212,165,116,0.9)'
                    : results[candidates[i]?.id]
                    ? 'rgba(74,124,92,0.6)'
                    : 'rgba(140,105,65,0.25)',
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(candidates.length - 1, i + 1))}
            disabled={isLastPipe}
            className="flex items-center gap-1 text-xs disabled:opacity-30"
            style={{ color: 'rgba(224,216,200,0.5)' }}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
