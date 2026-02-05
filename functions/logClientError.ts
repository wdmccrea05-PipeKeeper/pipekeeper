/**
 * Backend handler for client error logging.
 * Stores error logs for observability and post-release diagnostics.
 */


import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Basic validation
    if (!payload.message || !payload.route) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store error log (if entity exists - optional)
    try {
      // Check if ClientErrorLog entity exists
      await base44.asServiceRole.entities.ClientErrorLog?.create({
        timestamp: payload.timestamp,
        message: payload.message,
        stack: payload.stack,
        route: payload.route,
        language: payload.language,
        userAgent: payload.userAgent,
        userEmail: payload.userEmail,
        context: payload.context,
      });
    } catch (err) {
      // Entity might not exist yet - just log to console
      console.warn('[logClientError] Could not store to database:', err?.message);
    }

    // Always log to Deno stdout for observability
    console.log(JSON.stringify({
      type: 'CLIENT_ERROR',
      timestamp: payload.timestamp,
      email: payload.userEmail,
      route: payload.route,
      language: payload.language,
      message: payload.message?.slice(0, 200),
    }));

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[logClientError] Handler failed:', error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});