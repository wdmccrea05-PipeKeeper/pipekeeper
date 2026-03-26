import React from 'react';
import { ArrowLeft, Tag, Image, BarChart2, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Tobacco Blend', bottle: 'Whiskey Bottle' };

const ENHANCEMENTS = {
  pipe: [
    { icon: Tag,      label: 'Shape & materials classification' },
    { icon: Ruler,    label: 'Dimensions and measurements' },
    { icon: Image,    label: 'Product photo lookup' },
  ],
  blend: [
    { icon: Tag,      label: 'Flavor profile & classification' },
    { icon: BarChart2,label: 'Cellaring & aging insights' },
    { icon: Image,    label: 'Label & logo lookup' },
  ],
  bottle: [
    { icon: Tag,      label: 'Tasting notes & profile' },
    { icon: BarChart2,label: 'Estimated market value' },
    { icon: Image,    label: 'Bottle photo lookup' },
  ],
};

export default function AddFlowEnhancementStep({ itemType, item, onConfirm, onBack }) {
  const enhancements = ENHANCEMENTS[itemType] || [];

  return (
    <div className="flex flex-col" style={{ minHeight: 320 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <button onClick={onBack} className="text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors mr-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          Enhancements
        </h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5 flex-1">
        <div>
          <p className="text-sm font-medium break-words" style={{ color: '#F5F1E7' }}>
            {item?.name}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
            We'll automatically enrich this record after saving:
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {enhancements.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.12)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(180,140,75,0.1)', border: '1px solid rgba(180,140,75,0.2)' }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(180,140,75,0.8)' }} />
              </div>
              <p className="text-sm flex-1 min-w-0 break-words" style={{ color: 'rgba(224,216,200,0.75)' }}>
                {label}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(46,125,92,0.15)', color: 'rgba(100,200,140,0.8)', border: '1px solid rgba(46,125,92,0.25)' }}>
                Auto
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>
          Enrichment runs in the background. Only empty fields are filled — your data is never overwritten.
        </p>

        <Button
          className="w-full mt-auto"
          onClick={onConfirm}
          style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff' }}
        >
          Add {TYPE_LABELS[itemType]}
        </Button>
      </div>
    </div>
  );
}