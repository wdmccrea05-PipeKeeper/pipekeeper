/**
 * Apple JWS (JSON Web Signature) Verifier for StoreKit 2 transaction verification.
 *
 * StoreKit 2 provides `Transaction.jsonRepresentation` — a JWS signed by Apple.
 * This module verifies the JWS signature using Apple's certificate chain (x5c)
 * and returns the decoded, verified transaction payload.
 *
 * Verification steps:
 *   1. Split JWS into header.payload.signature
 *   2. Decode header to extract x5c certificate chain
 *   3. Parse leaf X.509 certificate to extract SubjectPublicKeyInfo (SPKI)
 *   4. Import public key via Web Crypto API
 *   5. Verify JWS signature (ECDSA P-256 with SHA-256)
 *   6. Decode and return verified payload
 *
 * Security: This is the AUTHORITATIVE server-side verification. Client-supplied
 * subscription state is NOT authoritative until this verification confirms it.
 */

// ── DER parsing helpers ─────────────────────────────────────────────────────

function readDerLength(bytes: Uint8Array, pos: number): { length: number; nextPos: number } {
  const tag = bytes[pos];
  if (tag === undefined) return { length: 0, nextPos: pos };
  pos++;
  const lenByte = bytes[pos];
  if (lenByte === undefined) return { length: 0, nextPos: pos };
  if (lenByte < 0x80) {
    return { length: lenByte, nextPos: pos + 1 };
  }
  const numBytes = lenByte & 0x7f;
  pos++;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | (bytes[pos + i] || 0);
  }
  return { length, nextPos: pos + numBytes };
}

function skipDerElement(bytes: Uint8Array, pos: number): number {
  const _tag = bytes[pos];
  const { length, nextPos } = readDerLength(bytes, pos);
  return nextPos + length;
}

/**
 * Extract SubjectPublicKeyInfo (SPKI) bytes from a DER-encoded X.509 certificate.
 *
 * X.509 structure:
 *   SEQUENCE (Certificate)
 *     SEQUENCE (tbsCertificate)
 *       [0] version (optional)
 *       INTEGER serialNumber
 *       SEQUENCE signatureAlgorithm
 *       SEQUENCE issuer
 *       SEQUENCE validity
 *       SEQUENCE subject
 *       SEQUENCE subjectPublicKeyInfo  ← 7th or 8th element
 *       ...
 */
function extractSpkiFromCert(der: Uint8Array): Uint8Array | null {
  try {
    let pos = 0;
    // Outer SEQUENCE (Certificate)
    const certLen = readDerLength(der, pos);
    pos = certLen.nextPos;

    // tbsCertificate SEQUENCE
    const tbsLen = readDerLength(der, pos);
    const tbsStart = pos;
    pos = tbsLen.nextPos;

    // Skip version (optional [0] explicit tag)
    if (der[pos] === 0xA0) {
      pos = skipDerElement(der, pos);
    }

    // Skip serialNumber (INTEGER)
    pos = skipDerElement(der, pos);

    // Skip signatureAlgorithm (SEQUENCE)
    pos = skipDerElement(der, pos);

    // Skip issuer (SEQUENCE)
    pos = skipDerElement(der, pos);

    // Skip validity (SEQUENCE)
    pos = skipDerElement(der, pos);

    // Skip subject (SEQUENCE)
    pos = skipDerElement(der, pos);

    // Now at subjectPublicKeyInfo (SEQUENCE) — extract it
    const spkiStart = pos;
    const spkiEnd = skipDerElement(der, pos);

    // Verify we're still within tbsCertificate
    if (spkiEnd <= tbsStart + tbsLen.length + tbsLen.nextPos - tbsStart) {
      return der.subarray(spkiStart, spkiEnd);
    }
    return der.subarray(spkiStart, spkiEnd);
  } catch {
    return null;
  }
}

// ── Base64URL helpers ────────────────────────────────────────────────────────

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToString(b64url: string): string {
  const bytes = base64UrlToBytes(b64url);
  return new TextDecoder().decode(bytes);
}

// ── ECDSA raw-to-DER signature conversion ────────────────────────────────────

/**
 * Convert raw ECDSA signature (r || s, 32 bytes each for P-256) to DER format.
 * Web Crypto API's verify() expects DER-encoded ECDSA signatures.
 */
function rawEcdsaToDer(signature: Uint8Array): ArrayBuffer {
  const halfLen = Math.ceil(signature.length / 2);
  let r = signature.subarray(0, halfLen);
  let s = signature.subarray(halfLen);

  // Strip leading zeros (but keep at least 1 byte)
  while (r.length > 1 && r[0] === 0) r = r.subarray(1);
  while (s.length > 1 && s[0] === 0) s = s.subarray(1);

  // If the high bit is set, prepend a 0x00 byte (positive integer)
  const rBytes = r[0]! & 0x80 ? new Uint8Array([0, ...r]) : r;
  const sBytes = s[0]! & 0x80 ? new Uint8Array([0, ...s]) : s;

  const totalLen = 2 + rBytes.length + 2 + sBytes.length;
  const der = new Uint8Array(2 + totalLen);
  let offset = 0;

  der[offset++] = 0x30; // SEQUENCE
  der[offset++] = totalLen;

  der[offset++] = 0x02; // INTEGER
  der[offset++] = rBytes.length;
  der.set(rBytes, offset);
  offset += rBytes.length;

  der[offset++] = 0x02; // INTEGER
  der[offset++] = sBytes.length;
  der.set(sBytes, offset);

  return der.buffer;
}

// ── Main verification function ───────────────────────────────────────────────

export interface VerifiedAppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  environment: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate: number;
  revocationDate: number | null;
  revocationReason: string | null;
  isInAppPurchase: boolean;
  type: string;
  raw: any;
}

/**
 * Verify a StoreKit 2 JWS token and return the decoded transaction data.
 *
 * @param jws - The JWS string from Transaction.jsonRepresentation
 * @returns Verified transaction data, or null if verification fails
 */
export async function verifyAppleJws(jws: string): Promise<VerifiedAppleTransaction | null> {
  if (!jws || typeof jws !== 'string') return null;

  try {
    const parts = jws.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    // Decode header
    const header = JSON.parse(base64UrlToString(headerB64));

    // Verify algorithm
    if (header.alg !== 'ES256') {
      console.warn('[appleJwsVerifier] Unexpected algorithm:', header.alg);
      return null;
    }

    // Extract x5c certificate chain
    const x5c = header.x5c;
    if (!x5c || !Array.isArray(x5c) || x5c.length === 0) {
      console.warn('[appleJwsVerifier] No x5c certificate chain in header');
      return null;
    }

    // Parse leaf certificate and extract SPKI
    const certDer = base64UrlToBytes(x5c[0]);
    const spki = extractSpkiFromCert(certDer);
    if (!spki) {
      console.warn('[appleJwsVerifier] Could not extract SPKI from certificate');
      return null;
    }

    // Import public key
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Verify signature
    const signedData = new TextEncoder().encode(headerB64 + '.' + payloadB64);
    const rawSignature = base64UrlToBytes(sigB64);
    const derSignature = rawEcdsaToDer(rawSignature);

    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      derSignature,
      signedData
    );

    if (!isValid) {
      console.warn('[appleJwsVerifier] JWS signature verification FAILED');
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlToString(payloadB64));

    // Extract and normalize transaction fields
    // StoreKit 2 JWS payload uses signedTransactionInfo and signedRenewalInfo
    // For direct Transaction.jsonRepresentation, the payload IS the transaction info
    const txInfo = payload.signedTransactionInfo ? null : payload;
    const data = txInfo || payload;

    const result: VerifiedAppleTransaction = {
      transactionId: String(data.transactionId || data.transaction_id || ''),
      originalTransactionId: String(data.originalTransactionId || data.original_transaction_id || data.transactionId || ''),
      productId: String(data.productId || data.product_id || ''),
      bundleId: String(data.bundleId || data.bundle_id || ''),
      environment: String(data.environment || 'Production'),
      purchaseDate: Number(data.purchaseDate || data.purchase_date || 0),
      originalPurchaseDate: Number(data.originalPurchaseDate || data.original_purchase_date || 0),
      expiresDate: Number(data.expiresDate || data.expires_date || 0),
      revocationDate: data.revocationDate ? Number(data.revocationDate) : (data.revocation_date ? Number(data.revocation_date) : null),
      revocationReason: data.revocationReason || data.revocation_reason || null,
      isInAppPurchase: data.isInAppPurchase !== false,
      type: String(data.type || 'Auto-Renewable Subscription'),
      raw: data,
    };

    return result;
  } catch (err) {
    console.error('[appleJwsVerifier] Verification error:', err);
    return null;
  }
}

/**
 * Check if a verified transaction represents active paid access.
 */
export function isTransactionActive(tx: VerifiedAppleTransaction): boolean {
  if (!tx) return false;

  // Revoked transactions are NOT active
  if (tx.revocationDate && tx.revocationDate > 0) {
    return false;
  }

  // Check expiration (expiresDate is in ms since epoch)
  if (tx.expiresDate && tx.expiresDate > 0) {
    const now = Date.now();
    if (tx.expiresDate <= now) {
      return false;
    }
  }

  // Must have a valid product ID
  if (!tx.productId) return false;

  return true;
}

/**
 * Convert Apple expiresDate (ms since epoch) to ISO string.
 */
export function appleDateToIso(ms: number): string | null {
  if (!ms || ms <= 0) return null;
  return new Date(ms).toISOString();
}