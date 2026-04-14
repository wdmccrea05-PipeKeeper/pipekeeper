/**
 * ingestProductImage
 *
 * Server-side image ingestion endpoint.
 *
 * Accepts: POST { url: string, entityType?: string, name?: string }
 * Returns: { ok: true, cachedImageUrl: string, contentType: string }
 *       or { ok: false, reason: 'not-an-image' | 'fetch-failed' | 'blocked' | 'invalid-url' | 'upload-failed' }
 *
 * Steps:
 *   1. Validate URL (must be http/https, no private IPs)
 *   2. Fetch image server-side with browser-like headers to bypass anti-bot rules
 *   3. Verify response content-type starts with image/
 *   4. Reject HTML / pages / oversized responses
 *   5. Upload to base44 file storage via UploadFile
 *   6. Return stable internal URL
 *
 * This function is the core of the server-side image ingestion pipeline.
 * It replaces the previous approach of proxying hotlinks via weserv.nl.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 15_000;

// Map MIME type → file extension for uploaded filenames
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg':    '.jpg',
  'image/jpg':     '.jpg',
  'image/png':     '.png',
  'image/webp':    '.webp',
  'image/gif':     '.gif',
  'image/avif':    '.avif',
  'image/svg+xml': '.svg',
  'image/bmp':     '.bmp',
  'image/tiff':    '.tiff',
};

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Block SSRF attempts targeting private/loopback/link-local address ranges.
 */
function isBlockedHostname(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '::1') return true;

    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const a = Number(ipv4[1]);
      const b = Number(ipv4[2]);
      if (a === 10) return true;                         // 10.x.x.x
      if (a === 127) return true;                        // 127.x.x.x
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16-31.x.x
      if (a === 192 && b === 168) return true;           // 192.168.x.x
      if (a === 169 && b === 254) return true;           // 169.254.x.x (link-local)
      if (a === 0) return true;                          // 0.x.x.x
    }

    return false;
  } catch {
    return false;
  }
}

function isImageContentType(ct: string): boolean {
  return ct.toLowerCase().startsWith('image/');
}

function extensionFromMime(contentType: string): string {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] || '.jpg';
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method-not-allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as {
      url?: string;
      entityType?: string;
      name?: string;
    };

    const rawUrl     = String(body?.url         || '').trim();
    const entityType = String(body?.entityType  || 'product').replace(/[^a-z]/gi, '').slice(0, 20);
    const name       = String(body?.name        || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 60);

    // ── URL validation ────────────────────────────────────────────────────────

    if (!rawUrl || !isValidUrl(rawUrl)) {
      return Response.json({ ok: false, reason: 'invalid-url' }, { status: 400 });
    }

    if (isBlockedHostname(rawUrl)) {
      return Response.json({ ok: false, reason: 'blocked' }, { status: 403 });
    }

    // ── Server-side fetch ─────────────────────────────────────────────────────

    let imageResponse: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      imageResponse = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'Accept':          'image/webp,image/avif,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Sec-Fetch-Dest':  'image',
          'Sec-Fetch-Mode':  'no-cors',
        },
      });

      clearTimeout(timeout);
    } catch {
      console.warn('[ingestProductImage] fetch failed:', rawUrl);
      return Response.json({ ok: false, reason: 'fetch-failed' }, { status: 502 });
    }

    if (!imageResponse.ok) {
      console.warn('[ingestProductImage] remote returned', imageResponse.status, rawUrl);
      return Response.json({ ok: false, reason: 'fetch-failed' }, { status: 502 });
    }

    // ── Content-type validation ───────────────────────────────────────────────

    const contentType = imageResponse.headers.get('content-type') || '';
    if (!isImageContentType(contentType)) {
      return Response.json({ ok: false, reason: 'not-an-image' }, { status: 422 });
    }

    // ── Size cap ──────────────────────────────────────────────────────────────

    const buffer = await imageResponse.arrayBuffer();

    if (buffer.byteLength === 0) {
      return Response.json({ ok: false, reason: 'not-an-image' }, { status: 422 });
    }

    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ ok: false, reason: 'too-large' }, { status: 413 });
    }

    // ── Upload to base44 storage ──────────────────────────────────────────────

    const ext      = extensionFromMime(contentType);
    const safeName = name ? `_${name}` : '';
    const filename = `${entityType}${safeName}_${Date.now()}${ext}`;

    let fileUrl: string;
    try {
      const file = new File(
        [new Uint8Array(buffer)],
        filename,
        { type: contentType.split(';')[0].trim() },
      );
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      fileUrl = uploadResult?.file_url;
      if (!fileUrl) throw new Error('No file_url returned from UploadFile');
    } catch (uploadError) {
      console.error('[ingestProductImage] upload error:', uploadError);
      return Response.json({ ok: false, reason: 'upload-failed' }, { status: 500 });
    }

    return Response.json({
      ok:             true,
      cachedImageUrl: fileUrl,
      contentType:    contentType.split(';')[0].trim(),
    });
  } catch (error) {
    console.error('[ingestProductImage] fatal error:', error);
    return Response.json(
      { ok: false, reason: error instanceof Error ? error.message : 'unknown-error' },
      { status: 500 },
    );
  }
});
