# iOS Native Barcode Scanner Bridge Contract

## Status

**Web implementation complete — native iOS implementation still required.**

No native iOS source code (Swift, Objective-C, Capacitor, Xcode project, Info.plist, or
WKWebView configuration) exists within this Base44 project. The app is a pure web
application served inside an external native iOS WKWebView wrapper that is maintained
by a separate native team.

This document defines the exact contract the native iOS team must implement for the
PipeKeeper barcode scanner to work end-to-end on iOS devices.

---

## Handler Registration

### Message handler name

```
scanBarcode
```

The WKWebView must register a single message handler named `scanBarcode`:

```swift
let contentController = WKUserContentController()
contentController.add(self, name: "scanBarcode")
```

Fallback handler names the web layer also checks (in order):
1. `scanBarcode`  ← **preferred — register this one**
2. `barcodeScanner`
3. `barcode`

If none of these are registered, the web layer falls back to manual barcode entry.

### Camera permission (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>PipeKeeper needs camera access to scan product barcodes.</string>
```

---

## Request Payload (Web → Native)

When the user opens the barcode scanner, the web layer calls:

```javascript
window.webkit.messageHandlers.scanBarcode.postMessage({ action: "scanBarcode" });
```

| Field   | Type   | Value        | Description                        |
|---------|--------|--------------|------------------------------------|
| action  | string | "scanBarcode" | Request type — always this value |

No other fields are sent. The native handler should present a full-screen
barcode scanner UI upon receiving this message.

---

## Response Payload (Native → Web)

The native handler must dispatch a `CustomEvent` on the `window` object when the
scan completes, is cancelled, or errors.

### Event name

```
pipekeeper_barcode_result
```

### Dispatch method

```swift
let js = """
window.dispatchEvent(new CustomEvent('pipekeeper_barcode_result', {
  detail: { success: true, code: "123456789012" }
}));
"""
webView.evaluateJavaScript(js)
```

### Success payload

```json
{
  "success": true,
  "code": "0123456789012"
}
```

| Field   | Type    | Description                              |
|---------|---------|------------------------------------------|
| success | boolean | Always `true` for a successful scan     |
| code    | string  | The scanned barcode value (digits only) |

The `code` field must be a string containing the raw barcode digits (UPC-A,
UPC-E, EAN-13, or EAN-8). Do not include check-digit stripping or formatting —
send the exact value read by the scanner.

### Cancellation payload

```json
{
  "success": false,
  "cancelled": true
}
```

| Field     | Type    | Description                              |
|-----------|---------|------------------------------------------|
| success   | boolean | Always `false` for cancellation          |
| cancelled | boolean | Always `true` — distinguishes from errors |

### Error payload

```json
{
  "success": false,
  "error": "Camera permission denied"
}
```

| Field   | Type    | Description                              |
|---------|---------|------------------------------------------|
| success | boolean | Always `false` for errors                |
| error   | string  | Human-readable error message             |

If the camera permission is denied, send:

```json
{
  "success": false,
  "error": "Camera permission denied"
}
```

Do NOT send `cancelled: true` for permission denials — only for explicit user
cancellation (tapping a cancel/close button).

---

## Supported Barcode Formats

The scanner must detect these 1D product barcode formats:

| Format   | Use Case                          |
|----------|-----------------------------------|
| UPC-A    | Standard US/Canada product barcodes |
| UPC-E    | Compressed US product barcodes     |
| EAN-13   | International product barcodes     |
| EAN-8    | Small product barcodes             |

Use AVFoundation with `AVCaptureMetadataOutput` or the Vision framework
(`VNDetectBarcodesRequest`) configured for these metadata object types:

```swift
metadataOutput.metadataObjectTypes = [
    .upce, .ean13, .ean8, .upca
]
```

---

## Native Scanner Requirements

1. **Camera permission**: Request `AVCaptureDevice` authorization before
   presenting the scanner. If already granted, present immediately.

2. **Present scanner**: Show a full-screen camera viewfinder with a scanning
   reticle. Include a visible Cancel button (minimum 44pt touch target).

3. **Single callback**: Dispatch exactly ONE `pipekeeper_barcode_result` event
   per scan request. After dispatching, dismiss the scanner and stop the camera
   session. Do not dispatch duplicate events for the same scan.

4. **Cancellation**: If the user taps Cancel or swipes down to dismiss,
   dispatch the cancellation payload. Do not leave the camera running.

5. **Permission denied**: If camera permission is not granted, dispatch the
   error payload with `"Camera permission denied"`. Do not present a blank
   scanner view.

6. **Camera cleanup**: Always call `captureSession.stopRunning()` and release
   the camera after dispatching the result, whether success, cancellation, or
   error. The camera must not remain active after the scanner is dismissed.

7. **Re-scan support**: Each `postMessage({ action: "scanBarcode" })` call must
   start a fresh scan session. The user must be able to scan again during the
   same app session without restarting the app.

8. **App lifecycle**: If the app is backgrounded during a scan and then
   foregrounded, the scanner should resume cleanly. If the camera session was
   interrupted, dispatch an error payload so the web layer can show a retry
   option.

---

## Web-Side Consumers

The following web-side functions consume the native response:

### 1. `requestNativeBarcodeScan()`
**File:** `src/components/utils/nativeIAPBridge.jsx` (lines 50–108)

- Listens for `pipekeeper_barcode_result` event
- Resolves the Promise with `detail.code` on `success: true`
- Rejects with `Error("Scan cancelled")` if `detail.cancelled` is true
- Rejects with `Error("Scan failed")` on any other non-success
- 2-minute timeout rejects with `Error("Barcode scan timed out")`
- Removes the event listener after the first result (no duplicate callbacks)

### 2. `startNativeBridgeScan()`
**File:** `src/components/identify/BarcodeScannerModal.jsx` (lines 80–96)

- Calls `requestNativeBarcodeScan()`
- On success: calls `handleDetected(code)` → passes barcode to `onDetected` callback
- On "cancelled" error: calls `handleClose()` → closes the scanner modal cleanly
- On other error: sets error status with message, shows retry + manual entry options

### 3. `hasNativeBarcodeScanner()`
**File:** `src/components/utils/nativeIAPBridge.jsx` (lines 28–36)

- Returns `true` if `window.webkit.messageHandlers.scanBarcode` (or fallback
  names) exists
- Used by `BarcodeScannerModal` to decide whether to attempt native scan first
- This is the gate: if the handler is not registered, the web layer skips
  native scanning and falls back to web BarcodeDetector or manual entry

---

## Verification Checklist (Native Team)

After implementing the handler, verify:

- [ ] `window.webkit.messageHandlers.scanBarcode` exists in the WKWebView
- [ ] `hasNativeBarcodeScanner()` returns `true` (check in Safari console)
- [ ] Tapping scan button presents native camera scanner
- [ ] Scanning a UPC-A barcode dispatches success with correct code
- [ ] Tapping Cancel dispatches cancellation payload
- [ ] Denying camera permission dispatches error payload
- [ ] Camera is released after scan/cancel/error (check with Xcode debugger)
- [ ] Second scan request works without app restart
- [ ] App backgrounded during scan → foregrounded → scanner resumes or errors cleanly
- [ ] No duplicate `pipekeeper_barcode_result` events per scan

---

## No Further Base44 Changes Required

Once the native handler is registered with the exact contract above, no
additional web-side changes are needed. The web implementation is complete and
will automatically use the native scanner when `hasNativeBarcodeScanner()`
returns `true`.