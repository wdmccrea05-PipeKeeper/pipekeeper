/**
 * BarcodeScannerModal
 *
 * Live camera barcode scanner using getUserMedia + BarcodeDetector when supported.
 * On iOS (including native WKWebView), BarcodeDetector is unavailable, so the
 * modal attempts a native bridge scan first (via window.webkit.messageHandlers.scanBarcode).
 * If neither web nor native scanning is available, shows manual-entry fallback.
 *
 * Usage:
 *   <BarcodeScannerModal open={true} onDetected={(code) => ...} onClose={() => ...} />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Barcode, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIOSWebView, hasNativeBarcodeScanner, requestNativeBarcodeScan } from '@/components/utils/nativeIAPBridge';

const SCAN_INTERVAL_MS = 300; // scan a frame every 300ms

const PREFERRED_BARCODE_FORMATS = ['upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'codabar'];

function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

function isIOSSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios');
  return isIOS && isSafari;
}

/**
 * Whether ANY scanning method is available (web BarcodeDetector OR native bridge).
 * This is the canonical check used by AddFlowIdentify to decide whether to
 * show the "Scan Barcode with Camera" button.
 */
export function canAttemptLiveBarcodeScan() {
  // Web BarcodeDetector + getUserMedia
  if (
    isBarcodeDetectorSupported()
    && typeof navigator !== 'undefined'
    && !!navigator?.mediaDevices?.getUserMedia
  ) {
    return true;
  }
  // Native iOS bridge
  if (hasNativeBarcodeScanner()) {
    return true;
  }
  return false;
}

export default function BarcodeScannerModal({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanInFlightRef = useRef(false);
  const detectedRef = useRef(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const [status, setStatus] = useState('starting'); // 'starting' | 'scanning' | 'error' | 'unsupported' | 'native_scanning'
  const [errorMsg, setErrorMsg] = useState('');
  const [unsupportedMsg, setUnsupportedMsg] = useState('');

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    scanInFlightRef.current = false;
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (_) {
        // pause() may throw if media state has already transitioned during teardown.
      }
      video.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    detectedRef.current = false;
    onClose();
  }, [stopCamera, onClose]);

  const handleDetected = useCallback((code) => {
    if (typeof code !== 'string' && typeof code !== 'number') return;
    const normalizedCode = String(code ?? '').trim();
    if (!normalizedCode) return;
    if (detectedRef.current) return;
    detectedRef.current = true;
    stopCamera();
    onDetected(normalizedCode);
  }, [stopCamera, onDetected]);

  // ── Native bridge scan ──
  const startNativeBridgeScan = useCallback(async () => {
    setStatus('native_scanning');
    try {
      const code = await requestNativeBarcodeScan();
      handleDetected(code);
    } catch (err) {
      if (detectedRef.current) return; // already detected and handled
      const msg = err?.message || '';
      if (msg.includes('cancelled')) {
        // User cancelled — close the modal cleanly
        handleClose();
        return;
      }
      setErrorMsg(`Native scanner error: ${msg}`);
      setStatus('error');
    }
  }, [handleDetected, handleClose]);

  // Start scanning loop using BarcodeDetector
  const startNativeScanner = useCallback(async (stream) => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    await video.play();

    const formats = [...PREFERRED_BARCODE_FORMATS, 'qr_code'];
    // Filter to only supported formats to avoid DOMException on some browsers
    let supportedFormats = formats;
    try {
      const allSupported = await BarcodeDetector.getSupportedFormats();
      supportedFormats = formats.filter((f) => allSupported.includes(f));
    } catch (_) {
      // ignore — use all formats
    }

    detectorRef.current = new BarcodeDetector({ formats: supportedFormats.length ? supportedFormats : formats });

    setStatus('scanning');

    const scanFrame = async () => {
      if (!video || video.readyState < 2 || detectedRef.current) return;
      if (scanInFlightRef.current) {
        scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
        return;
      }
      scanInFlightRef.current = true;
      try {
        const barcodes = await detectorRef.current.detect(video);
        if (barcodes.length > 0) {
          handleDetected(barcodes[0].rawValue);
          return;
        }
      } catch (_) {
        // Ignore transient frame-detection errors while the stream settles or refreshes.
      } finally {
        scanInFlightRef.current = false;
      }

      if (!detectedRef.current) {
        scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
      }
    };

    scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
  }, [handleDetected]);

  useEffect(() => {
    if (!open) return;

    detectedRef.current = false;
    setStatus('starting');
    setErrorMsg('');
    setUnsupportedMsg('');

    // ── Priority 1: Native iOS bridge (works in WKWebView where BarcodeDetector is unavailable) ──
    if (hasNativeBarcodeScanner()) {
      startNativeBridgeScan();
      return;
    }

    // ── Priority 2: Web BarcodeDetector ──
    if (!isBarcodeDetectorSupported()) {
      const inNativeApp = isIOSWebView();
      setUnsupportedMsg(
        inNativeApp
          ? 'Live camera scanning requires a newer app version. Please type the barcode manually below.'
          : isIOSSafari()
          ? 'Live camera scanning is not supported on iPhone Safari yet. Please use manual barcode entry.'
          : 'Live camera scanning is not supported in this browser. Manual barcode entry is still available.'
      );
      setStatus('unsupported');
      return;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      setUnsupportedMsg('Camera access is unavailable on this device or browser. Manual barcode entry is still available.');
      setStatus('unsupported');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        try {
          const supportedFormats = await BarcodeDetector.getSupportedFormats();
          const has1DSupport = PREFERRED_BARCODE_FORMATS.some((format) => supportedFormats.includes(format));
          if (!has1DSupport) {
            setUnsupportedMsg('This browser camera cannot scan product barcodes yet. Please type the barcode manually.');
            setStatus('unsupported');
            return;
          }
        } catch (formatErr) {
          console.warn('[BarcodeScannerModal] Failed to inspect supported barcode formats:', formatErr);
          // Continue and let runtime scan decide.
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        await startNativeScanner(stream);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.name === 'NotAllowedError'
              ? 'Camera permission denied. Allow camera access in your device settings and try again.'
              : err?.name === 'NotFoundError'
              ? 'No camera found on this device.'
              : `Camera error: ${err?.message || 'Unknown error'}`;
          setErrorMsg(msg);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, startNativeScanner, startNativeBridgeScan, stopCamera, retryNonce]);

  if (!open) return null;

  const headerLabel = status === 'scanning'
    ? 'Point camera at barcode'
    : status === 'native_scanning'
    ? 'Scanning with camera…'
    : status === 'unsupported'
    ? 'Live scan unavailable'
    : status === 'error'
    ? 'Camera unavailable'
    : 'Starting camera…';

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      {/* Header — safe-area aware, 44pt close button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
        style={{
          background: 'rgba(0,0,0,0.5)',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: '0.75rem',
        }}>
        <div className="flex items-center gap-2 min-w-0">
          <Barcode className="w-5 h-5 flex-shrink-0" style={{ color: '#D4A574' }} />
          <span className="font-semibold text-sm truncate" style={{ color: '#F5F1E7' }}>
            {headerLabel}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="flex items-center justify-center rounded-full flex-shrink-0"
          aria-label="Close scanner"
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#F5F1E7',
            minHeight: 44,
            minWidth: 44,
            width: 44,
            height: 44,
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video viewfinder (web BarcodeDetector only) */}
      {status !== 'error' && status !== 'unsupported' && status !== 'native_scanning' && (
        <div className="relative w-full max-w-sm mx-4" style={{ aspectRatio: '1/1', maxHeight: '60vh' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover rounded-2xl"
            playsInline
            muted
            autoPlay
            style={{ background: '#000' }}
          />
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Corner brackets */}
            <div className="relative w-56 h-36">
              {/* top-left */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: '#D4A574' }} />
              {/* top-right */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: '#D4A574' }} />
              {/* bottom-left */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: '#D4A574' }} />
              {/* bottom-right */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: '#D4A574' }} />
              {/* Scanning line animation */}
              {status === 'scanning' && (
                <div
                  className="absolute left-2 right-2 h-0.5 animate-bounce"
                  style={{ background: 'rgba(212,165,116,0.7)', top: '50%' }}
                />
              )}
            </div>
          </div>
          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4A574' }} />
            </div>
          )}
        </div>
      )}

      {/* Native bridge scanning — show spinner while native camera is active */}
      {status === 'native_scanning' && (
        <div className="mx-6 text-center">
          <Camera className="w-12 h-12 mx-auto mb-4" style={{ color: '#D4A574' }} />
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#D4A574' }} />
          <p className="text-base font-semibold mb-1" style={{ color: '#F5F1E7' }}>
            Camera Active
          </p>
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Point your camera at the barcode. The scanner will detect it automatically.
          </p>
        </div>
      )}

      {/* Unsupported browser message */}
      {status === 'unsupported' && (
        <div className="mx-6 text-center">
          <Barcode className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(212,165,116,0.5)' }} />
          <p className="text-base font-semibold mb-2" style={{ color: '#F5F1E7' }}>
            Live scanning not available
          </p>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {unsupportedMsg || "Your browser doesn't support live barcode scanning. Please type the barcode number manually."}
          </p>
          <Button onClick={handleClose} variant="outline" className="w-full" style={{ minHeight: 44 }}>
            Continue to Manual Entry
          </Button>
        </div>
      )}

      {/* Camera error message */}
      {status === 'error' && (
        <div className="mx-6 text-center">
          <p className="text-base font-semibold mb-2" style={{ color: '#F5F1E7' }}>Camera unavailable</p>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>{errorMsg}</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                stopCamera();
                detectedRef.current = false;
                setRetryNonce((v) => v + 1);
              }}
              className="w-full"
              style={{ minHeight: 44 }}
            >
              Retry Camera
            </Button>
            <Button onClick={handleClose} variant="outline" className="w-full" style={{ minHeight: 44 }}>
              Type Manually Instead
            </Button>
          </div>
        </div>
      )}

      {/* Status hint */}
      {status === 'scanning' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Hold steady with good lighting — scanning automatically
        </p>
      )}
    </div>
  );
}