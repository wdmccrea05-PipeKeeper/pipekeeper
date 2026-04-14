/**
 * proxyImage
 *
 * Server-side image proxy endpoint.
 *
 * Accepts: POST { url: string }
 * Returns: { dataUrl: string, contentType: string, ok: true }
 *       or { ok: false, error: string }
 *
 * Why this exists
 * ---------------
 * Many product retailers block direct image hotlinking or cross-origin image
 * requests. Fetching the image server-side bypasses those restrictions because
 * the request originates from a neutral server IP, not from the browser.
 *
 * Security
 * --------
 * - Only domains matching the trusted image source list are proxied.
 * - Non-image content-types are rejected.
 * - Response size is capped to prevent abuse.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Allowed domains ───────────────────────────────────────────────────────────

const ALLOWED_DOMAINS = new Set([
  // Whiskey retailers / databases
  'whiskybase.com',
  'masterofmalt.com',
  'thewhiskyexchange.com',
  'finedrams.com',
  'dekanta.com',
  'nickollsandperks.co.uk',
  'royalmilewhiskies.com',
  'hardtofindwhisky.com',
  'totalwine.com',
  'reservebar.com',
  'astorwines.com',
  'whiskyauctioneer.com',
  'whisky.com',
  'ardbeg.com',
  'laphroaig.com',
  'buffalotrace.com',
  'heavenhill.com',
  'sazerac.com',
  'bushmills.com',
  // Tobacco blends
  'smokingpipes.com',
  'pipesandcigars.com',
  'tobaccopipes.com',
  'cupojoes.com',
  '4noggins.com',
  'tobaccoreviews.com',
  'iwan-ries.com',
  'cornellanddiehl.com',
  'glpease.com',
  'sutliff.com',
  'macbaren.com',
  'petersontobacco.com',
  // Pipes
  'pipedia.org',
  'alpascia.com',
  'danpipe.de',
  'savinelli.com',
  'petersonsmoking.com',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const IMAGE_EXTENSION_RE = /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?[^/]*)?$/i;
const MAX_BYTES = 512 * 1024; // 512 KB

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (ALLOWED_DOMAINS.has(hostname)) return true;
    // Subdomain match (e.g. shop.masterofmalt.com)
    for (const allowed of ALLOWED_DOMAINS) {
      if (hostname.endsWith('.' + allowed)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isImageContentType(ct: string): boolean {
  return ct.toLowerCase().startsWith('image/');
}

function looksLikeImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return IMAGE_EXTENSION_RE.test(path);
  } catch {
    return false;
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { url?: string };
    const rawUrl = String(body?.url || '').trim();

    if (!rawUrl || !rawUrl.startsWith('http')) {
      return Response.json({ ok: false, error: 'Valid URL required' }, { status: 400 });
    }

    if (!isAllowedDomain(rawUrl)) {
      return Response.json({ ok: false, error: 'Domain not in trusted list' }, { status: 403 });
    }

    if (!looksLikeImageUrl(rawUrl)) {
      return Response.json({ ok: false, error: 'URL does not appear to be an image' }, { status: 400 });
    }

    // Fetch image server-side with browser-like headers to bypass anti-bot checks
    const imageResponse = await fetch(rawUrl, {
      headers: {
        'Accept':          'image/webp,image/avif,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest':  'image',
        'Sec-Fetch-Mode':  'no-cors',
      },
    });

    if (!imageResponse.ok) {
      return Response.json(
        { ok: false, error: `Remote returned ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const contentType = imageResponse.headers.get('content-type') || '';
    if (!isImageContentType(contentType)) {
      return Response.json(
        { ok: false, error: `Unexpected content-type: ${contentType}` },
        { status: 422 },
      );
    }

    // Cap response size to prevent memory exhaustion
    const buffer = await imageResponse.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json(
        { ok: false, error: 'Image exceeds size limit' },
        { status: 413 },
      );
    }

    // Encode as base64 data URL so the browser can render it without a
    // separate network request back to the retailer
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(buffer)),
    );
    const dataUrl = `data:${contentType.split(';')[0].trim()};base64,${base64}`;

    return Response.json({ ok: true, dataUrl, contentType });
  } catch (error) {
    console.error('[proxyImage] error:', error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Proxy failed' },
      { status: 500 },
    );
  }
});
