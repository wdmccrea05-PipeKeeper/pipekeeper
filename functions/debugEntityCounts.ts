/**
 * Debug entity query to find root cause of anomalous counts
 */


import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check if .list() returns an array or number
    const pipesRaw = await base44.entities.Pipe.list();
    const blendsRaw = await base44.entities.TobaccoBlend.list();
    
    console.log('[DEBUG] Pipe.list() result type:', typeof pipesRaw);
    console.log('[DEBUG] Pipe.list() is array:', Array.isArray(pipesRaw));
    console.log('[DEBUG] Pipe.list() length:', pipesRaw?.length);
    console.log('[DEBUG] First 3 pipes:', pipesRaw?.slice(0, 3));

    console.log('[DEBUG] TobaccoBlend.list() result type:', typeof blendsRaw);
    console.log('[DEBUG] TobaccoBlend.list() is array:', Array.isArray(blendsRaw));
    console.log('[DEBUG] TobaccoBlend.list() length:', blendsRaw?.length);
    console.log('[DEBUG] First 3 blends:', blendsRaw?.slice(0, 3));

    return new Response(JSON.stringify({
      pipes: {
        type: typeof pipesRaw,
        isArray: Array.isArray(pipesRaw),
        length: pipesRaw?.length,
        sample: Array.isArray(pipesRaw) ? pipesRaw.slice(0, 1) : pipesRaw,
      },
      blends: {
        type: typeof blendsRaw,
        isArray: Array.isArray(blendsRaw),
        length: blendsRaw?.length,
        sample: Array.isArray(blendsRaw) ? blendsRaw.slice(0, 1) : blendsRaw,
      },
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});