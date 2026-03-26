import React, { useState } from 'react';
import { X, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PipeShapeIcon from '@/components/pipes/PipeShapeIcon';

const ITEM_TYPES = [
  {
    key: 'pipe',
    label: 'Pipe',
    emoji: '🪵',
    desc: 'Briar, meerschaum, corn cob',
  },
  {
    key: 'blend',
    label: 'Tobacco Blend',
    emoji: '🍃',
    desc: 'Virginia, Latakia, Aromatic',
  },
  {
    key: 'bottle',
    label: 'Whiskey Bottle',
    emoji: '🥃',
    desc: 'Scotch, Bourbon, Rye & more',
  },
];

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Tobacco Blend', bottle: 'Whiskey Bottle' };

export default function AddFlowEntry({ fixedType, onSelectType, onSelectMode, onClose, onBack }) {
  const [localType, setLocalType] = useState(fixedType || null);
  const isModeStep = !!fixedType || (localType && onSelectMode);
  const activeType = fixedType || localType;

  const handleTypeClick = (key) => {
    if (onSelectMode) {
      onSelectType(key);
    } else {
      setLocalType(key);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 340 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors mr-1">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {activeType && onSelectMode
              ? `Add ${TYPE_LABELS[activeType]}`
              : 'Add to Collection'}
          </h2>
        </div>
        <button onClick={onClose} className="text-[#E0D8C8]/50 hover:text-[#E0D8C8] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4 flex-1">
        {/* If we have a fixed type OR have selected a type, show mode selector */}
        {activeType && onSelectMode ? (
          <>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'rgba(180,140,75,0.7)' }}>
              Choose how to add
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onSelectMode('quick')}
                className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(180,140,75,0.2)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(163,92,92,0.18)', border: '1px solid rgba(163,92,92,0.3)' }}>
                    <Zap className="w-4 h-4" style={{ color: '#D4A574' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>Quick Add</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
                      Enter name and maker — done in seconds
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onSelectMode('smart')}
                className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, rgba(180,140,75,0.1), rgba(180,140,75,0.06))',
                  border: '1px solid rgba(180,140,75,0.35)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.3)' }}>
                    <Sparkles className="w-4 h-4" style={{ color: '#D4A574' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>Smart Add</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(180,140,75,0.2)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}>
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
                      Search, confirm, and auto-enrich with AI
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'rgba(180,140,75,0.7)' }}>
              What are you adding?
            </p>
            <div className="flex flex-col gap-2.5">
              {ITEM_TYPES.map(({ key, label, emoji, desc }) => (
                <button
                  key={key}
                  onClick={() => handleTypeClick(key)}
                  className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: localType === key ? 'rgba(180,140,75,0.12)' : 'rgba(255,255,255,0.04)',
                    border: localType === key ? '1px solid rgba(180,140,75,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm break-words" style={{ color: '#F5F1E7' }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {localType && !onSelectMode && (
              <Button
                className="w-full mt-2"
                onClick={() => onSelectType(localType)}
                style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff' }}
              >
                Continue
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}