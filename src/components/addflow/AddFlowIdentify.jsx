import React, { useState } from 'react';
import {
  ArrowLeft,
  Barcode,
  Camera,
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
import BarcodeScannerModal from '@/components/identify/BarcodeScannerModal';

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
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleLookup = async (lookupCode) => {
    const trimmed = (lookupCode ?? code).trim();
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
              {t('addFlowIdentify.upcTitle', 'Enter UPC / Barcode')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {t('addFlowIdentify.upcSubtitle', 'Scan a barcode with your camera or type it manually')}
            </p>
          </div>
        </div>

        <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Live camera scan button */}
          <button
            onClick={() => setScannerOpen(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl transition-colors"
            style={{
              background: 'rgba(86,122,160,0.1)',
              border: '1px solid rgba(86,122,160,0.35)',
              color: 'rgba(140,180,220,0.85)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">{t('addFlowIdentify.scanBarcode', 'Scan Barcode with Camera')}</span>
          </button>

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
      toast.error(t('addFlowIdentify.uploadError', 'Failed to upload photos'));
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
            {t('addFlowIdentify.photoSubtitle', 'Upload or take a photo — AI identifies and prefills details')}
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
              {uploading ? t('common.uploading', 'Uploading…') : t('common.takePhoto', 'Take Photo')}
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
              {uploading ? t('common.uploading', 'Uploading…') : t('common.uploadPhoto', 'Upload Photo')}
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
                {t('addFlowIdentify.analyzing', 'Analyzing…')}
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
          <span className="text-sm">{t('addFlow.addManually', 'Add Manually Instead')}</span>
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

function ResultsPanel({ result, onSelect, onBack, onManual }) {
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
            {t('addFlowIdentify.resultsTitle', 'Select the Best Match')}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
            {candidates.length} {t('addFlowIdentify.candidatesFound', 'candidate(s) found')}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-5 flex flex-col gap-3">
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
                  </div>
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
            {t('addFlowIdentify.noMatches', 'No matches found.')}
          </p>
        )}

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
  const [subMode, setSubMode] = useState(initialMode); // 'selector' | 'upc' | 'photo' | 'results'
  const [identifyResult, setIdentifyResult] = useState(null);

  const handleResult = (result) => {
    setIdentifyResult(result);
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
        onSelect={handleSelectCandidate}
        onBack={backToSelector}
        onManual={onManual}
      />
    );
  }

  return null;
}
