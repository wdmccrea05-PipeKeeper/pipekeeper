/**
 * Barcode scanning capability detection — extracted from BarcodeScannerModal
 * so it can be unit-tested without pulling in React/Button components
 * (which trigger @vitejs/plugin-react preamble errors in the test environment).
 */

import { hasNativeBarcodeScanner } from '@/components/utils/nativeIAPBridge';

const PREFERRED_BARCODE_FORMATS = [
  'upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'codabar',
];

export { PREFERRED_BARCODE_FORMATS };

export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function isIOSSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari =
    ua.includes('safari') &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('edgios');
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
    isBarcodeDetectorSupported() &&
    typeof navigator !== 'undefined' &&
    !!navigator?.mediaDevices?.getUserMedia
  ) {
    return true;
  }
  // Native iOS bridge
  if (hasNativeBarcodeScanner()) {
    return true;
  }
  return false;
}