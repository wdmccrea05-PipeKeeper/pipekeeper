import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Tobacco Blend', bottle: 'Whiskey Bottle' };

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-xs flex-shrink-0 w-24 pt-0.5" style={{ color: 'rgba(180,140,75,0.6)' }}>{label}</span>
      <span className="text-xs flex-1 min-w-0 break-words" style={{ color: 'rgba(224,216,200,0.85)' }}>{value}</span>
    </div>
  );
}

function buildMeta(itemType, item) {
  if (itemType === 'pipe') return [
    { label: 'Shape', value: item.shape },
    { label: 'Material', value: item.bowl_material },
    { label: 'Finish', value: item.finish },
  ];
  if (itemType === 'blend') return [
    { label: 'Type', value: item.blend_type },
    { label: 'Strength', value: item.strength },
    { label: 'Notes', value: Array.isArray(item.flavor_notes) ? item.flavor_notes.join(', ') : item.flavor_notes },
  ];
  if (itemType === 'bottle') return [
    { label: 'Type', value: item.whiskey_type },
    { label: 'Age', value: item.age ? `${item.age} years` : null },
    { label: 'ABV', value: item.abv ? `${item.abv}%` : null },
    { label: 'Region', value: item.region },
  ];
  return [];
}

export default function AddFlowConfirmStep({ itemType, item, onConfirm, onBack }) {
  if (!item) return null;
  const meta = buildMeta(itemType, item);
  const hasMeta = meta.some(m => m.value);

  return (
    <div className="flex flex-col" style={{ minHeight: 320 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <button onClick={onBack} className="text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors mr-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          Confirm {TYPE_LABELS[itemType]}
        </h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4 flex-1">
        {/* Item card */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,0.07), rgba(180,140,75,0.03))',
            border: '1px solid rgba(180,140,75,0.22)',
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.22)' }}
            >
              {itemType === 'pipe' ? '🪵' : itemType === 'blend' ? '🍃' : '🥃'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm break-words" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
                {item.name}
              </p>
              {item.brand && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>{item.brand}</p>
              )}
              {item.description && (
                <p className="text-xs mt-2 break-words" style={{ color: 'rgba(224,216,200,0.5)' }}>{item.description}</p>
              )}
            </div>
          </div>

          {hasMeta && (
            <div className="mt-4 pt-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid rgba(180,140,75,0.14)' }}>
              {meta.map(({ label, value }) => (
                <MetaRow key={label} label={label} value={value} />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-auto">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onBack}
            style={{ borderColor: 'rgba(180,140,75,0.22)', color: 'rgba(224,216,200,0.7)' }}
          >
            Refine
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff' }}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}