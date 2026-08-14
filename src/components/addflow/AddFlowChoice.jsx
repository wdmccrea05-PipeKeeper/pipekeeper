import React from 'react';
import { X, Search, PenLine, Barcode, Camera } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function AddFlowChoice({ typeLabel, onQuickAdd, onManualAdd, onScanUPC, onPhotoIdentify, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('addFlow.addNewType', { type: typeLabel })}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.58)' }}>
            {t('addFlow.chooseHowToAdd')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/10 flex-shrink-0 ml-4"
          style={{ color: 'rgba(224,216,200,0.5)', minHeight: 44, minWidth: 44, width: 44, height: 44 }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-3">
        {/* Quick Add — recommended */}
        <button
          onClick={onQuickAdd}
          className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99] group"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,0.13), rgba(180,140,75,0.06))',
            border: '1px solid rgba(180,140,75,0.35)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(180,140,75,0.18)', border: '1px solid rgba(180,140,75,0.3)' }}
            >
              <Search className="w-5 h-5" style={{ color: '#D4A574' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-base" style={{ color: '#F5F1E7' }}>{t('addFlow.quickSearch')}</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(180,140,75,0.2)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.32)' }}
                >
                  {t('addFlow.recommended')}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t('addFlow.quickSearchDescription')}
              </p>
            </div>
          </div>
        </button>

        {/* Scan UPC */}
        {onScanUPC && (
          <button
            onClick={onScanUPC}
            className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.07), rgba(180,140,75,0.02))',
              border: '1px solid rgba(180,140,75,0.22)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.26)' }}
              >
                <Barcode className="w-5 h-5" style={{ color: '#D4A574' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>{t('addFlow.scanBarcode')}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {t('addFlow.scanBarcodeDescription')}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Photo Identify */}
        {onPhotoIdentify && (
          <button
            onClick={onPhotoIdentify}
            className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'rgba(86,122,160,0.06)',
              border: '1px solid rgba(86,122,160,0.25)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(86,122,160,0.14)', border: '1px solid rgba(86,122,160,0.28)' }}
              >
                <Camera className="w-5 h-5" style={{ color: 'rgba(140,180,220,0.9)' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>{t('addFlow.photoIdentify')}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {t('addFlow.photoIdentifyDescription')}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Manual Add */}
        <button
          onClick={onManualAdd}
          className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(163,92,92,0.1)', border: '1px solid rgba(163,92,92,0.22)' }}
            >
              <PenLine className="w-5 h-5" style={{ color: 'rgba(220,160,160,0.8)' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base" style={{ color: '#F5F1E7' }}>{t('addFlow.addManually')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {t('addFlow.addManuallyDescription')}
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="pb-4" />
    </div>
  );
}