import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BarcodeScannerModal, { canAttemptLiveBarcodeScan } from '@/components/identify/BarcodeScannerModal';

const originalBarcodeDetector = globalThis.BarcodeDetector;
const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const userAgentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
const playDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'play');
const pauseDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'pause');

function mockBarcodeDetector({ detect = vi.fn(async () => []), supportedFormats = ['ean_13', 'upc_a', 'code_128'] } = {}) {
  class MockBarcodeDetector {
    constructor() {
      this.detect = detect;
    }

    static async getSupportedFormats() {
      return supportedFormats;
    }
  }
  globalThis.BarcodeDetector = MockBarcodeDetector;
}

function setMediaDevices(getUserMedia) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
}

function setUserAgent(value) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value,
  });
}

describe('BarcodeScannerModal', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(() => undefined),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalBarcodeDetector) {
      globalThis.BarcodeDetector = originalBarcodeDetector;
    } else {
      delete globalThis.BarcodeDetector;
    }
    if (mediaDevicesDescriptor) {
      Object.defineProperty(navigator, 'mediaDevices', mediaDevicesDescriptor);
    } else {
      delete navigator.mediaDevices;
    }
    if (userAgentDescriptor) {
      Object.defineProperty(navigator, 'userAgent', userAgentDescriptor);
    }
    if (playDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'play', playDescriptor);
    }
    if (pauseDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, 'pause', pauseDescriptor);
    }
  });

  it('shows manual fallback when BarcodeDetector is unavailable', async () => {
    delete globalThis.BarcodeDetector;

    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText('Live scanning not available')).toBeTruthy();
    expect(screen.getByText('Live scan unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue to Manual Entry' })).toBeTruthy();
  });

  it('shows iPhone Safari specific fallback guidance when unsupported', async () => {
    delete globalThis.BarcodeDetector;
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');

    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText(/iPhone Safari/i)).toBeTruthy();
  });

  it('shows manual fallback when camera APIs are unavailable', async () => {
    mockBarcodeDetector();
    delete navigator.mediaDevices;

    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText('Live scanning not available')).toBeTruthy();
  });

  it('falls back when detector is present but 1D barcode formats are unsupported', async () => {
    mockBarcodeDetector({ supportedFormats: ['qr_code'] });
    setMediaDevices(vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })));

    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText('Live scanning not available')).toBeTruthy();
    expect(screen.getByText(/cannot scan product barcodes yet/i)).toBeTruthy();
  });

  it('stops camera tracks when closed to avoid stuck camera state', async () => {
    mockBarcodeDetector();
    const stop = vi.fn();
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [{ stop }],
    }));
    setMediaDevices(getUserMedia);

    const onClose = vi.fn();
    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={onClose} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Close scanner' }));

    expect(stop).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows retrying camera initialization after a failure', async () => {
    mockBarcodeDetector();
    const permissionError = new Error('denied');
    permissionError.name = 'NotAllowedError';
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(permissionError)
      .mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
    setMediaDevices(getUserMedia);

    render(<BarcodeScannerModal open onDetected={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText(/Camera permission denied/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Camera' }));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Hold steady with good lighting — scanning automatically')).toBeTruthy();
  });

  it('reports scanner capability only when camera + detector are both available', () => {
    delete globalThis.BarcodeDetector;
    expect(canAttemptLiveBarcodeScan()).toBe(false);

    mockBarcodeDetector();
    setMediaDevices(vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })));
    expect(canAttemptLiveBarcodeScan()).toBe(true);
  });

});
