import React from 'react';
import { X, Search, PenLine, ScanLine } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function AddFlowChoice({ typeLabel, onQuickAdd, onManualAdd, onIdentify, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Add New {typeLabel}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.58)' }}>
            Choose how you'd like to add this item.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10 flex-shrink-0 ml-4"
          style={{ color: 'rgba(224,216,200,0.5)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      {/* Choice cards */}
      <div className="px-6 py-6 flex flex-col gap-4">
        {/* Quick Add */}
        <button
          onClick={onQuickAdd}
          className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99] group"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,0.1), rgba(180,140,75,0.05))',
            border: '1px solid rgba(180,140,75,0.3)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.28)' }}
            >
              <Search className="w-5 h-5" style={{ color: '#D4A574' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-base" style={{ color: '#F5F1E7' }}>Quick Add</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(180,140,75,0.2)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.32)' }}
                >
                  Recommended
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                Search our database and create a record quickly with minimal effort.
              </p>
            </div>
          </div>
        </button>

        {/* Manual Add */}
        <button
          onClick={onManualAdd}
          className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(163,92,92,0.12)', border: '1px solid rgba(163,92,92,0.25)' }}
            >
              <PenLine className="w-5 h-5" style={{ color: 'rgba(220,160,160,0.85)' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>Add Manually</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                Enter the item yourself in a guided step-by-step flow.
              </p>
            </div>
          </div>
        </button>

        {/* Scan / Photo Identify */}
        {onIdentify && (
          <button
            onClick={onIdentify}
            className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(86,122,160,0.25)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(86,122,160,0.12)', border: '1px solid rgba(86,122,160,0.28)' }}
              >
                <ScanLine className="w-5 h-5" style={{ color: 'rgba(140,180,220,0.85)' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>
                  {t('addFlowChoice.scanOrIdentify', 'Scan or Photo Identify')}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {t('addFlowChoice.scanOrIdentifyDesc', 'Use a barcode or photo to identify and prefill the item automatically.')}
                </p>
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="pb-4" />
    </div>
  );
}