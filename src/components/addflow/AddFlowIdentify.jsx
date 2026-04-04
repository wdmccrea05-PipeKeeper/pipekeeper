import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Barcode,
  Camera,
  ChevronRight,
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
} from '@/components/identify/identifyEngine';

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
            {t('addFlowIdentify.title', 'Scan or Identify')} {typeLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('addFlowIdentify.subtitle', 'Use a barcode or photo to identify and prefill details')}
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
                {t('addFlowIdentify.scanUPC', 'Scan or Enter UPC')}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t('addFlowIdentify.upcDesc', 'Enter or scan a barcode to look up the item automatically')}
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
                {t('addFlowIdentify.photoIdentify', 'Photo Identify')}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                {t('addFlowIdentify.photoDesc', 'Upload or take a photo and let AI identify the item')}
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
          <span className="text-sm">{t('addFlow.addManually', 'Add Manually Instead')}</span>
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

  const handleLookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await identifyByUPC(trimmed, itemType);
      onResult(result);
    } catch (err) {
      console.error('UPC lookup error:', err);
      toast.error(t('addFlowIdentify.upcError', 'UPC lookup failed. Please try again or add manually.'));
    } finally {
      setLoading(false);
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
            {t('addFlowIdentify.upcTitle', 'Enter UPC / Barcode')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('addFlowIdentify.upcSubtitle', 'Type or paste the barcode number from the packaging')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder={t('addFlowIdentify.upcPlaceholder', 'e.g. 0 12345 67890 5')}
            className="flex-1"
            inputMode="numeric"
            style={{
              background: 'rgba(20,13,8,0.7)',
              border: '1px solid rgba(180,140,75,0.3)',
              color: '#F5F1E7',
            }}
          />
          <Button
            onClick={handleLookup}
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
            <span className="text-sm">{t('addFlowIdentify.lookingUp', 'Looking up barcode…')}</span>
          </div>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually', 'Add Manually Instead')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
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
      toast.error(t('addFlowIdentify.uploadError', 'Failed to upload photos'));
    } finally {
      setUploading(false);
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
      toast.error(t('addFlowIdentify.analyzeError', 'Photo identification failed. Please try again.'));
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
            {t('addFlowIdentify.photoTitle', 'Photo Identify')} {typeLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {t('addFlowIdentify.photoSubtitle', 'Upload photos for AI-powered identification')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Photo grid */}
        <div className="grid grid-cols-4 gap-2">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-stone-700 relative group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {/* Upload button */}
          <label
            className="aspect-square rounded-lg border-2 border-dashed border-stone-600 hover:border-amber-600 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
            style={{ color: 'rgba(180,140,75,0.6)' }}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-xs">{t('common.upload', 'Upload')}</span>
              </>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} disabled={uploading || analyzing} />
          </label>
          {/* Camera button */}
          <label
            className="aspect-square rounded-lg border-2 border-dashed border-stone-600 hover:border-amber-600 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1"
            style={{ color: 'rgba(180,140,75,0.6)' }}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-xs">{t('common.camera', 'Camera')}</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={uploading || analyzing} />
          </label>
        </div>

        {photoUrls.length > 0 && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || uploading}
            className="w-full"
            style={{
              background: 'linear-gradient(135deg, rgba(86,122,160,0.9), rgba(66,100,140,0.9))',
              color: '#F5F1E7',
              fontWeight: 600,
            }}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('addFlowIdentify.analyzing', 'Analyzing photos…')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('addFlowIdentify.identifyPhotos', 'Identify from Photos')}
              </>
            )}
          </Button>
        )}

        {!photoUrls.length && !uploading && (
          <p className="text-xs text-center" style={{ color: 'rgba(224,216,200,0.35)' }}>
            {t('addFlowIdentify.uploadHint', 'Upload or take photos of the item to identify it')}
          </p>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually', 'Add Manually Instead')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}

// ── Results panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, onSelect, onBack, onManual }) {
  const { t } = useTranslation();
  const { confidence, candidates = [], selected } = result || {};

  const isLow = confidence === 'low' || !candidates.length;
  const isHigh = confidence === 'high' && candidates.length === 1;

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
        <h2 className="text-lg font-bold min-w-0" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          {t('addFlowIdentify.resultsTitle', 'Identification Results')}
        </h2>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Confidence badge */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: isLow
              ? 'rgba(180,60,60,0.12)'
              : isHigh
              ? 'rgba(46,125,92,0.12)'
              : 'rgba(180,140,75,0.1)',
            border: `1px solid ${isLow ? 'rgba(180,60,60,0.25)' : isHigh ? 'rgba(46,125,92,0.25)' : 'rgba(180,140,75,0.25)'}`,
            color: isLow ? 'rgba(220,140,140,0.9)' : isHigh ? 'rgba(100,200,150,0.9)' : 'rgba(212,165,116,0.9)',
          }}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          {isLow
            ? t('addFlowIdentify.lowConfidence', 'No confident match found — you can still add manually')
            : isHigh
            ? t('addFlowIdentify.highConfidence', 'High confidence match found')
            : t('addFlowIdentify.mediumConfidence', 'Possible matches found — select one to confirm')}
        </div>

        {/* Candidate list */}
        {candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            {candidates.slice(0, 5).map((candidate, idx) => (
              <button
                key={`${candidate.name}-${idx}`}
                onClick={() => onSelect(candidate)}
                className="w-full text-left flex items-start justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]"
                style={{
                  border: idx === 0
                    ? '1px solid rgba(180,140,75,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm break-words" style={{ color: '#F5F1E7' }}>
                      {candidate.name}
                    </p>
                    {idx === 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(180,140,75,0.18)', color: '#D4A574', border: '1px solid rgba(180,140,75,0.3)' }}
                      >
                        {isHigh ? t('addFlowIdentify.bestMatch', 'Best Match') : t('addFlowIdentify.topMatch', 'Top Match')}
                      </span>
                    )}
                  </div>
                  {candidate.maker && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>
                      {candidate.maker}
                    </p>
                  )}
                  {candidate.category && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      {candidate.category}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(180,140,75,0.5)' }} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onManual}
          className="flex items-center gap-2 justify-center w-full py-3 rounded-xl transition-colors hover:bg-white/5"
          style={{ border: '1px dashed rgba(180,140,75,0.25)', color: 'rgba(180,140,75,0.7)' }}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-sm">{t('addFlow.addManually', 'Add Manually Instead')}</span>
        </button>
      </div>
      <div className="pb-2" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * AddFlowIdentify — the "Scan or Photo Identify" step within the add flow.
 *
 * Props:
 *   itemType   "pipe" | "blend" | "bottle"
 *   typeLabel  Human-readable label
 *   onBack     () => void  — go back to choice screen
 *   onManual   () => void  — fall through to manual add
 *   onSelected (candidate, identifyResult) => void  — user confirmed a candidate
 */
export default function AddFlowIdentify({ itemType, typeLabel, onBack, onManual, onSelected }) {
  const { t } = useTranslation();
  const [subMode, setSubMode] = useState('selector'); // 'selector' | 'upc' | 'photo' | 'results'
  const [identifyResult, setIdentifyResult] = useState(null);

  const handleResult = (result) => {
    setIdentifyResult(result);
    // High confidence with exactly one candidate → skip candidate list, go straight to confirm
    if (result.confidence === 'high' && result.candidates.length === 1) {
      onSelected(result.candidates[0], result);
    } else {
      setSubMode('results');
    }
  };

  const handleSelectCandidate = (candidate) => {
    onSelected(candidate, identifyResult);
  };

  if (subMode === 'selector') {
    return (
      <FeatureGate
        feature="AI_IDENTIFY"
        featureName={t('addFlowIdentify.featureName', 'AI Identify')}
        description={t('addFlowIdentify.featureDescription', 'Identify items by barcode or photo with AI')}
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
        onBack={() => setSubMode('selector')}
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
        onBack={() => setSubMode('selector')}
        onManual={onManual}
      />
    );
  }

  if (subMode === 'results') {
    return (
      <ResultsPanel
        result={identifyResult}
        onSelect={handleSelectCandidate}
        onBack={() => setSubMode('selector')}
        onManual={onManual}
      />
    );
  }

  return null;
}
