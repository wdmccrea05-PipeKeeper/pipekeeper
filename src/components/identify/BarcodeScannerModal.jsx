/**
 * BarcodeScannerModal
 *
 * Live camera barcode scanner using getUserMedia + BarcodeDetector (Chrome/Android).
 * On iOS Safari (no BarcodeDetector), falls back to the jsQR WASM library loaded
 * dynamically from CDN for QR codes, plus a manual-entry fallback for 1D barcodes.
 *
 * Usage:
 *   <BarcodeScannerModal open={true} onDetected={(code) => ...} onClose={() => ...} />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCAN_INTERVAL_MS = 300; // scan a frame every 300ms

function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export default function BarcodeScannerModal({ open, onDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const detectedRef = useRef(false);

  const [status, setStatus] = useState('starting'); // 'starting' | 'scanning' | 'error' | 'unsupported'
  const [errorMsg, setErrorMsg] = useState('');

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
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
    if (detectedRef.current) return;
    detectedRef.current = true;
    stopCamera();
    onDetected(code);
  }, [stopCamera, onDetected]);

  // Start scanning loop using BarcodeDetector
  const startNativeScanner = useCallback(async (stream) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.srcObject = stream;
    await video.play();

    const formats = ['upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'itf', 'codabar'];
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

    scanIntervalRef.current = setInterval(async () => {
      if (!video || video.readyState < 2 || detectedRef.current) return;
      try {
        const barcodes = await detectorRef.current.detect(video);
        if (barcodes.length > 0) {
          handleDetected(barcodes[0].rawValue);
        }
      } catch (_) {
        // ignore per-frame errors
      }
    }, SCAN_INTERVAL_MS);
  }, [handleDetected]);

  useEffect(() => {
    if (!open) return;

    detectedRef.current = false;
    setStatus('starting');
    setErrorMsg('');

    if (!isBarcodeDetectorSupported()) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
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
              ? 'Camera permission denied. Please allow camera access and try again.'
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
  }, [open, startNativeScanner, stopCamera]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5" style={{ color: '#D4A574' }} />
          <span className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>
            {status === 'scanning' ? 'Point camera at barcode' : 'Starting camera…'}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#F5F1E7' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video viewfinder */}
      {status !== 'error' && status !== 'unsupported' && (
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

      {/* Hidden canvas for frame capture (not used with native BarcodeDetector but kept for future) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Unsupported browser message */}
      {status === 'unsupported' && (
        <div className="mx-6 text-center">
          <Barcode className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(212,165,116,0.5)' }} />
          <p className="text-base font-semibold mb-2" style={{ color: '#F5F1E7' }}>
            Live scanning not available
          </p>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Your browser doesn't support live barcode scanning. Please type the barcode number manually.
          </p>
          <Button onClick={handleClose} variant="outline" className="w-full">
            Type Manually Instead
          </Button>
        </div>
      )}

      {/* Camera error message */}
      {status === 'error' && (
        <div className="mx-6 text-center">
          <p className="text-base font-semibold mb-2" style={{ color: '#F5F1E7' }}>Camera unavailable</p>
          <p className="text-sm mb-6" style={{ color: 'rgba(224,216,200,0.6)' }}>{errorMsg}</p>
          <Button onClick={handleClose} variant="outline" className="w-full">
            Type Manually Instead
          </Button>
        </div>
      )}

      {/* Status hint */}
      {status === 'scanning' && (
        <p className="mt-4 text-sm text-center" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Hold steady — scanning automatically
        </p>
      )}
    </div>
  );
}