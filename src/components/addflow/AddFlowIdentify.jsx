import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Camera,
  Search,
  Loader2,
  PenLine,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useTranslation } from '@/components/i18n/safeTranslation';
import {
  identifyByUPC,
  identifyByImageUrls,
  uploadIdentifyImages,
  normalizeSingleCandidate,
} from '@/components/identify/identifyEngine';
import BarcodeScannerModal, { canAttemptLiveBarcodeScan } from '@/components/identify/BarcodeScannerModal';
import { searchForRecord } from '@/lib/search/unifiedSearchService';

// ── Sub-mode selector ─────────────────────────────────────────────────────────

function ModeSelector({ onSelectUPC, onSelectPhoto, onManual, onBack, typeLabel }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('addFlowIdentify.title')} {typeLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('addFlowIdentify.subtitle')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-4">
        {/* UPC option */}
        <button
          onClick={onSelectUPC}
          className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
              <Barcode className="w-5 h-5" style={{ color: '#D4A574' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>
                {t('addFlowIdentify.scanUPC')}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t('addFlowIdentify.upcDesc')}
              </p>
            </div>
          </div>
        </button>

        {/* Photo option */}
        <button
          onClick={onSelectPhoto}
          className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(86,122,160,0.15)', border: '1px solid rgba(86,122,160,0.28)' }}
            >
              <Camera className="w-5 h-5" style={{ color: 'rgba(140,180,220,0.85)' }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base mb-1" style={{ color: '#F5F1E7' }}>
                {t('addFlowIdentify.photoIdentify')}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t('addFlowIdentify.photoDesc')}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5 mt-1"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}

// ── UPC panel ─────────────────────────────────────────────────────────────────

function UPCPanel({ itemType, typeLabel, onResult, onBack, onManual }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const canUseLiveScanner = useMemo(() => canAttemptLiveBarcodeScan(), []);

  const handleLookup = async (lookupCode) => {
    const trimmed = (lookupCode ?? code).trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await identifyByUPC(trimmed, itemType);
      onResult(result);
    } catch (err) {
      console.error('UPC lookup error:', err);
      toast.error(t('addFlowIdentify.upcError'));
    } finally {
      setLoading(false);
    }
  };

  const handleScanDetected = (detectedCode) => {
    setScannerOpen(false);
    setCode(detectedCode);
    handleLookup(detectedCode);
  };

  return (
    <>
      <BarcodeScannerModal
        open={scannerOpen}
        onDetected={handleScanDetected}
        onClose={() => setScannerOpen(false)}
      />

      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'rgba(224,216,200,0.6)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {t('addFlowIdentify.upcTitle')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {t('addFlowIdentify.upcSubtitle')}
            </p>
          </div>
        </div>

        <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Live camera scan button */}
          <button
            onClick={() => canUseLiveScanner && setScannerOpen(true)}
            disabled={loading || !canUseLiveScanner}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl transition-colors"
            style={{
              background: canUseLiveScanner ? 'rgba(86,122,160,0.1)' : 'rgba(90,90,90,0.18)',
              border: canUseLiveScanner ? '1px solid rgba(86,122,160,0.35)' : '1px solid rgba(150,150,150,0.28)',
              color: canUseLiveScanner ? 'rgba(140,180,220,0.85)' : 'rgba(224,216,200,0.5)',
              opacity: loading ? 0.6 : canUseLiveScanner ? 1 : 0.9,
            }}
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">
              {canUseLiveScanner
                ? t('addFlowIdentify.scanBarcode')
                : t('addFlowIdentify.scanUnavailable')}
            </span>
          </button>
          {!canUseLiveScanner && (
            <p className="text-xs -mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {t('addFlowIdentify.scanUnavailableHint')}
            </p>
          )}

          <div className="flex items-center gap-3">
            <div style={{ flex: 1, height: 1, background: 'rgba(180,140,75,0.12)' }} />
            <span className="text-xs" style={{ color: 'rgba(224,216,200,0.35)' }}>or type manually</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(180,140,75,0.12)' }} />
          </div>

          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder={t('addFlowIdentify.upcPlaceholder')}
              className="flex-1"
              inputMode="numeric"
              style={{
                background: 'rgba(20,13,8,0.7)',
                border: '1px solid rgba(180,140,75,0.3)',
                color: '#F5F1E7',
              }}
            />
            <Button
              onClick={() => handleLookup()}
              disabled={loading || !code.trim()}
              style={{
                background: 'linear-gradient(135deg, rgba(180,140,75,0.9), rgba(150,115,60,0.9))',
                color: '#1a1008',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'rgba(224,216,200,0.4)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('addFlowIdentify.lookingUp')}</span>
            </div>
          )}

          <button
            onClick={onManual}
            className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5"
            style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span className="text-sm">{t('addFlow.addManually')}</span>
          </button>
        </div>
        <div className="pb-2" />
      </div>
    </>
  );
}

// ── Photo panel ───────────────────────────────────────────────────────────────

function PhotoPanel({ itemType, typeLabel, onResult, onBack, onManual }) {
  const { t } = useTranslation();
  const [photoUrls, setPhotoUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await uploadIdentifyImages(files);
      setPhotoUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err?.userMessage || t('addFlowIdentify.uploadError'));
    } finally {
      setUploading(false);
      // reset so same file can be re-selected
      e.target.value = '';
    }
  };

  const removePhoto = (idx) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (!photoUrls.length) return;
    setAnalyzing(true);
    try {
      const result = await identifyByImageUrls(photoUrls, itemType);
      onResult(result);
    } catch (err) {
      console.error('Photo identify error:', err);
      toast.error(err?.userMessage || t('addFlowIdentify.analyzeError'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('addFlowIdentify.photoTitle')} {typeLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('addFlowIdentify.photoSubtitle')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Large mobile-friendly camera + upload buttons */}
        <div className="grid grid-cols-2 gap-3">
          <label
            className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 py-7 transition-colors"
            style={{
              borderColor: uploading ? 'rgba(180,140,75,0.2)' : 'rgba(86,122,160,0.45)',
              background: 'rgba(86,122,160,0.06)',
              color: 'rgba(140,180,220,0.85)',
            }}
          >
            {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
            <span className="text-sm font-medium">
              {uploading ? t('common.uploading') : t('common.takePhoto')}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || analyzing}
            />
          </label>
          <label
            className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 py-7 transition-colors"
            style={{
              borderColor: uploading ? 'rgba(180,140,75,0.2)' : 'rgba(180,140,75,0.4)',
              background: 'rgba(180,140,75,0.06)',
              color: 'rgba(212,165,116,0.85)',
            }}
          >
            {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
            <span className="text-sm font-medium">
              {uploading ? t('common.uploading') : t('common.uploadPhoto')}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || analyzing}
            />
          </label>
        </div>

        {itemType === 'pipe' && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.62)' }}>
            Best results: upload the pipe side profile, stem logo, and any stamping or nomenclature.
          </p>
        )}

        {/* Uploaded photo thumbnails */}
        {photoUrls.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photoUrls.map((url, idx) => (
              <div key={idx} className="aspect-square rounded-xl overflow-hidden relative" style={{ border: '1px solid rgba(180,140,75,0.3)' }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                {/* Always-visible remove on mobile */}
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photoUrls.length > 0 && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || uploading}
            className="w-full h-12 text-base"
            style={{
              background: 'linear-gradient(135deg, rgba(86,122,160,1), rgba(66,100,140,1))',
              color: '#F5F1E7',
              fontWeight: 600,
            }}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('addFlowIdentify.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('addFlowIdentify.identifyPhotos', `Identify ${photoUrls.length} Photo${photoUrls.length !== 1 ? 's' : ''}`)}
              </>
            )}
          </Button>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}

// ── Results panel ─────────────────────────────────────────────────────────────

function candidateSubtitle(c) {
  const parts = [c.maker, c.manufacturer, c.distillery].filter(Boolean);
  return parts[0] || '';
}

function candidateMeta(c) {
  const chips = [];
  if (c.whiskey_type || c.type) chips.push(c.whiskey_type || c.type);
  if (c.age) chips.push(`${c.age} yr`);
  if (c.abv) chips.push(`${Number(c.abv).toFixed(1)}%`);
  if (c.blend_type) chips.push(c.blend_type);
  if (c.strength) chips.push(c.strength);
  if (c.shape) chips.push(c.shape);
  if (c.bowl_material) chips.push(c.bowl_material);
  return chips.filter(Boolean).slice(0, 3);
}

function candidateConfidenceScore(c, fallbackScore) {
  if (typeof c?.candidateConfidenceScore === 'number') return c.candidateConfidenceScore;
  return fallbackScore;
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function mergeWithQuickSearchCandidate(aiCandidate, quickCandidate, identifyConfidence) {
  if (!aiCandidate) return quickCandidate;
  if (!quickCandidate) return aiCandidate;
  if (identifyConfidence === 'low') return quickCandidate;

  const mergedDetails = { ...(quickCandidate.details || {}) };
  for (const [key, value] of Object.entries(aiCandidate.details || {})) {
    if (identifyConfidence === 'high') {
      if (!isBlank(value)) mergedDetails[key] = value;
      continue;
    }
    if (isBlank(mergedDetails[key]) && !isBlank(value)) {
      mergedDetails[key] = value;
    }
  }

  return {
    ...quickCandidate,
    details: mergedDetails,
    valuationSeed: {
      ...(quickCandidate.valuationSeed || {}),
      ...(identifyConfidence === 'high' ? (aiCandidate.valuationSeed || {}) : {}),
    },
  };
}

function buildPipeSearchTerms(result) {
  if (!result) return '';
  const candidate = result.candidates?.[0];
  const details = candidate?.details || {};
  const terms = [
    candidate?.maker,
    details.line_series,
    details.shape_number,
    details.shape,
    details.stamping,
    result.fallbackSearchTerms,
  ].filter(Boolean).join(' ').trim();
  return terms;
}

function ResultsPanel({ result, quickSearchMatches, quickSearchQuery, searchingQuickSearch, onSelect, onSelectQuickSearch, onBack, onManual }) {
  const { t } = useTranslation();
  const { confidence, candidates = [] } = result || {};

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('addFlowIdentify.resultsTitle')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {candidates.length} {t('addFlowIdentify.candidatesFound')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-3">
        {(result?.fallbackMessage || confidence === 'low') && (
          <div className="rounded-xl p-3" style={{ border: '1px solid rgba(180,140,75,0.35)', background: 'rgba(180,140,75,0.09)' }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#D4A574' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.78)' }}>
                {result?.fallbackMessage || 'We could not identify this confidently, but found possible matches.'}
              </p>
            </div>
          </div>
        )}

        {candidates.map((c, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(c)}
            className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: idx === 0 ? 'linear-gradient(135deg, rgba(180,140,75,0.1), rgba(180,140,75,0.05))' : 'rgba(255,255,255,0.03)',
              border: idx === 0 ? '1px solid rgba(180,140,75,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(180,140,75,0.2)', color: '#D4A574' }}
              >
                {idx + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>{c.name}</p>
                {candidateSubtitle(c) && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>{candidateSubtitle(c)}</p>
                )}
                {candidateMeta(c).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {candidateMeta(c).map((chip, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(224,216,200,0.65)' }}>{chip}</span>
                    ))}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(86,122,160,0.2)', color: 'rgba(180,210,235,0.9)' }}>
                      {typeof candidateConfidenceScore(c, result?.confidenceScore) === 'number'
                        ? `${candidateConfidenceScore(c, result?.confidenceScore)}% confidence`
                        : 'Confidence N/A'}
                    </span>
                  </div>
                )}
                {Array.isArray(c?.details?.evidence_used) && c.details.evidence_used.length > 0 && (
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
                    Evidence: {c.details.evidence_used.slice(0, 2).join(' • ')}
                  </p>
                )}
                {Array.isArray(c?.details?.uncertain_fields) && c.details.uncertain_fields.length > 0 && (
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(224,216,200,0.4)' }}>
                    Uncertain: {c.details.uncertain_fields.join(', ')}
                  </p>
                )}
                {c.description && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(224,216,200,0.45)' }}>
                    {c.description.slice(0, 120)}{c.description.length > 120 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}

        {candidates.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.4)' }}>
            {t('addFlowIdentify.noMatches')}
          </p>
        )}

        {(searchingQuickSearch || quickSearchMatches.length > 0) && (
          <div className="rounded-xl p-3 mt-1" style={{ border: '1px solid rgba(86,122,160,0.3)', background: 'rgba(86,122,160,0.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5" style={{ color: 'rgba(140,180,220,0.85)' }} />
              <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>
                {t('addFlowIdentify.quickSearchTitle')}
              </p>
            </div>
            {searchingQuickSearch && (
              <div className="flex items-center gap-2 py-1" style={{ color: 'rgba(224,216,200,0.55)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Searching…</span>
              </div>
            )}
            {!searchingQuickSearch && quickSearchMatches.length === 0 && quickSearchQuery && (
              <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
                No quick-search matches found.
              </p>
            )}
            {!searchingQuickSearch && quickSearchMatches.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {quickSearchMatches.map((item, index) => (
                  <button
                    key={item.id || `${item.title}-${index}`}
                    onClick={() => onSelectQuickSearch(item)}
                    className="w-full text-left rounded-lg px-2.5 py-2 transition-colors hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>{item.title || item.metadata?.name}</p>
                    <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.55)' }}>
                      {(item.metadata?.maker || item.metadata?.manufacturer || item.metadata?.subtitle || '').trim()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5 mt-1"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}

/**
 * AddFlowIdentify — the "Scan or Photo Identify" step within the add flow.
 *
 * Props:
 *   itemType   "pipe" | "blend" | "bottle" | "cigar"
 *   typeLabel  Human-readable label
 *   onBack     () => void  — go back to choice screen
 *   onManual   () => void  — fall through to manual add
 *   onSelected (candidate, identifyResult) => void  — user confirmed a candidate
 */
export default function AddFlowIdentify({ itemType, typeLabel, onBack, onManual, onSelected, initialMode = 'selector' }) {
  const { t } = useTranslation();
  const MAX_QUICK_SEARCH_RESULTS = 5;
  const [subMode, setSubMode] = useState(initialMode); // 'selector' | 'upc' | 'photo' | 'results'
  const [identifyResult, setIdentifyResult] = useState(null);
  const [searchingQuickSearch, setSearchingQuickSearch] = useState(false);
  const [quickSearchMatches, setQuickSearchMatches] = useState([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const handleResult = async (result) => {
    setIdentifyResult(result);
    setQuickSearchMatches([]);
    setQuickSearchQuery('');

    if (itemType === 'pipe') {
      const query = buildPipeSearchTerms(result);
      if (query) {
        setQuickSearchQuery(query);
        setSearchingQuickSearch(true);
        try {
          const { results } = await searchForRecord(query, 'pipe', { maxResults: MAX_QUICK_SEARCH_RESULTS });
          setQuickSearchMatches(results || []);
        } catch {
          setQuickSearchMatches([]);
        } finally {
          setSearchingQuickSearch(false);
        }
      }
    }

    if (result?.confidence === 'high' && result?.candidates?.length === 1) {
      onSelected(result.candidates[0], result);
    } else {
      setSubMode('results');
    }
  };

  const backToSelector = () => {
    // If we came from a direct-launch mode (upc/photo), go all the way back
    if (initialMode !== 'selector') onBack();
    else setSubMode('selector');
  };

  const handleSelectCandidate = (candidate) => {
    onSelected(candidate, identifyResult);
  };

  const handleSelectQuickSearch = (item) => {
    const quickCandidate = normalizeSingleCandidate(
      { ...(item?.metadata || {}), name: item?.title || item?.metadata?.name || '' },
      itemType,
      'search'
    );
    const merged = mergeWithQuickSearchCandidate(
      identifyResult?.candidates?.[0],
      quickCandidate,
      identifyResult?.confidence
    );
    onSelected(merged, {
      ...identifyResult,
      selectedMatchSource: 'quickSearch',
      quickSearchQuery,
      quickSearchCandidates: quickSearchMatches.length,
    });
  };

  if (subMode === 'selector') {
    return (
      <FeatureGate
        feature="AI_IDENTIFY"
        featureName={t('addFlowIdentify.featureName')}
        description={t('addFlowIdentify.featureDescription')}
      >
        <ModeSelector
          typeLabel={typeLabel}
          onSelectUPC={() => setSubMode('upc')}
          onSelectPhoto={() => setSubMode('photo')}
          onManual={onManual}
          onBack={onBack}
        />
      </FeatureGate>
    );
  }

  if (subMode === 'upc') {
    return (
      <UPCPanel
        itemType={itemType}
        typeLabel={typeLabel}
        onResult={handleResult}
        onBack={backToSelector}
        onManual={onManual}
      />
    );
  }

  if (subMode === 'photo') {
    return (
      <PhotoPanel
        itemType={itemType}
        typeLabel={typeLabel}
        onResult={handleResult}
        onBack={backToSelector}
        onManual={onManual}
      />
    );
  }

  if (subMode === 'results') {
    return (
      <ResultsPanel
        result={identifyResult}
        quickSearchMatches={quickSearchMatches}
        quickSearchQuery={quickSearchQuery}
        searchingQuickSearch={searchingQuickSearch}
        onSelect={handleSelectCandidate}
        onSelectQuickSearch={handleSelectQuickSearch}
        onBack={backToSelector}
        onManual={onManual}
      />
    );
  }

  return null;
}