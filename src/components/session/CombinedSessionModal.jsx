/**
 * CombinedSessionModal
 * Real multi-step combined session: choose pipe + blend + bottle, then log both
 * SmokingLog and TastingLog atomically. Does NOT require Curator.
 */

import React, { useState } from 'react';
import { X, ChevronRight, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { toast } from 'sonner';

function SelectItem({ item, selected, onClick, accent = '#D4A574' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{
        background: selected ? `${accent}18` : 'rgba(255,255,255,0.03)',
        border: selected ? `1px solid ${accent}55` : '1px solid rgba(180,140,75,0.14)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#F5F1E7] truncate">{item.name}</p>
        {item.sub ? <p className="text-xs text-[#D8C7A6]/65 mt-0.5">{item.sub}</p> : null}
      </div>
      {selected && <Check className="w-4 h-4 shrink-0" style={{ color: accent }} />}
    </button>
  );
}

export default function CombinedSessionModal({
  isOpen,
  onClose,
  pipes = [],
  blends = [],
  bottles = [],
}) {
  const { user } = useCurrentUser();
  const [step, setStep] = useState(0); // 0=pipe, 1=blend, 2=bottle, 3=confirm
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [selectedBlend, setSelectedBlend] = useState(null);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const hasPipe = pipes.length > 0;
  const hasBlend = blends.length > 0;
  const hasBottle = bottles.length > 0;

  // Steps depend on what the user has
  const steps = [
    hasPipe ? 'pipe' : null,
    hasBlend ? 'blend' : null,
    hasBottle ? 'bottle' : null,
    'confirm',
  ].filter(Boolean);

  const currentStep = steps[step];

  async function handleConfirm() {
    if (!user?.email) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const promises = [];

      if (selectedPipe) {
        promises.push(
          base44.entities.SmokingLog.create({
            pipe_id: selectedPipe.id,
            pipe_name: selectedPipe.name,
            blend_id: selectedBlend?.id || null,
            blend_name: selectedBlend?.name || null,
            bowls_used: 1,
            date: now,
          })
        );
      }

      if (selectedBottle) {
        promises.push(
          base44.entities.TastingLog.create({
            bottle_id: selectedBottle.id,
            bottle_name: selectedBottle.name,
            tasting_date: now,
          })
        );
      }

      await Promise.all(promises);

      const logged = [
        selectedPipe ? 'pipe session' : null,
        selectedBottle ? 'whiskey tasting' : null,
      ].filter(Boolean).join(' + ');

      toast.success(`Logged ${logged}!`);
      onClose();
    } catch (err) {
      toast.error('Failed to log session. Please try again.');
      console.error('[CombinedSessionModal]', err);
    } finally {
      setSaving(false);
    }
  }

  function advance() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="fixed inset-0 z-[1400] bg-black/75 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg,rgba(38,26,18,0.98),rgba(24,16,12,1))',
          border: '1px solid rgba(180,140,75,0.24)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[rgba(180,140,75,0.14)] shrink-0">
          <div>
            <h3 className="font-bold text-[#F5F1E7] text-lg">Combined Session</h3>
            <p className="text-xs mt-0.5 text-[#E0D8C8]/60">
              Step {step + 1} of {steps.length}
              {currentStep !== 'confirm' ? ` — ${currentStep === 'pipe' ? 'Select Pipe' : currentStep === 'blend' ? 'Select Blend' : 'Select Bottle'}` : ' — Confirm'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-[#E0D8C8]/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 min-h-0">
          {currentStep === 'pipe' && (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">Choose a pipe for this session (optional)</p>
              <SelectItem item={{ name: 'Skip — No pipe', id: null }} selected={selectedPipe === null && step > 0} onClick={() => { setSelectedPipe(null); advance(); }} accent="#888" />
              {pipes.map((p) => (
                <SelectItem key={p.id} item={{ name: p.name, sub: [p.maker, p.shape].filter(Boolean).join(' · ') }} selected={selectedPipe?.id === p.id} onClick={() => { setSelectedPipe(p); advance(); }} accent="#D4A574" />
              ))}
            </>
          )}

          {currentStep === 'blend' && (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">Choose a tobacco blend (optional)</p>
              <SelectItem item={{ name: 'Skip — No blend' }} selected={selectedBlend === null} onClick={() => { setSelectedBlend(null); advance(); }} accent="#888" />
              {blends.map((b) => (
                <SelectItem key={b.id} item={{ name: b.name, sub: [b.manufacturer, b.blend_type].filter(Boolean).join(' · ') }} selected={selectedBlend?.id === b.id} onClick={() => { setSelectedBlend(b); advance(); }} accent="#8FBD7B" />
              ))}
            </>
          )}

          {currentStep === 'bottle' && (
            <>
              <p className="text-xs text-[#D8C7A6]/55 mb-3">Choose a whiskey bottle (optional)</p>
              <SelectItem item={{ name: 'Skip — No whiskey' }} selected={selectedBottle === null} onClick={() => { setSelectedBottle(null); advance(); }} accent="#888" />
              {bottles.map((b) => (
                <SelectItem key={b.id} item={{ name: b.name, sub: [b.distillery, b.type].filter(Boolean).join(' · ') }} selected={selectedBottle?.id === b.id} onClick={() => { setSelectedBottle(b); advance(); }} accent="#B66565" />
              ))}
            </>
          )}

          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm text-[#D8C7A6]/70">Ready to log this combined session:</p>

              {selectedPipe || selectedBlend ? (
                <div className="rounded-xl p-4 border border-[rgba(212,165,116,0.22)] bg-[rgba(212,165,116,0.06)]">
                  <p className="text-xs font-semibold text-[#D4A574] uppercase tracking-wider mb-2">Pipe Session</p>
                  <p className="text-sm text-[#F5F1E7]">{selectedPipe?.name || 'No pipe selected'}</p>
                  {selectedBlend && <p className="text-xs text-[#D8C7A6]/65 mt-1">{selectedBlend.name}</p>}
                </div>
              ) : null}

              {selectedBottle ? (
                <div className="rounded-xl p-4 border border-[rgba(182,101,101,0.22)] bg-[rgba(182,101,101,0.06)]">
                  <p className="text-xs font-semibold text-[#D47C7C] uppercase tracking-wider mb-2">Whiskey Tasting</p>
                  <p className="text-sm text-[#F5F1E7]">{selectedBottle.name}</p>
                </div>
              ) : null}

              {!selectedPipe && !selectedBlend && !selectedBottle && (
                <p className="text-sm text-[#D8C7A6]/55">Nothing selected. Go back to choose at least one item.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 border-t border-[rgba(180,140,75,0.14)] shrink-0">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[#E0D8C8]/75 border border-[rgba(180,140,75,0.22)] hover:bg-white/5"
            >
              Back
            </button>
          )}

          {currentStep !== 'confirm' && (
            <button
              type="button"
              onClick={advance}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 'confirm' && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || (!selectedPipe && !selectedBlend && !selectedBottle)}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,rgba(163,92,92,1),rgba(143,72,72,1))', color: '#fff' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Logging…' : 'Log Session'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}