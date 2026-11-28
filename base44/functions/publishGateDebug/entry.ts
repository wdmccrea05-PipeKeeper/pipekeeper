/**
 * Debug entity query to find root cause of anomalous counts
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Totals come from the count; one small page supplies the sample records
    const pipeCount = await base44.entities.Pipe.count();
    const blendCount = await base44.entities.TobaccoBlend.count();
    const pipesRaw = await base44.entities.Pipe.list(null, 3, 0);
    const blendsRaw = await base44.entities.TobaccoBlend.list(null, 3, 0);
    
    console.log('[DEBUG] Pipe.list() result type:', typeof pipesRaw);
    console.log('[DEBUG] Pipe.list() is array:', Array.isArray(pipesRaw));
    console.log('[DEBUG] Pipe.list() total count:', pipeCount);
    console.log('[DEBUG] First 3 pipes:', pipesRaw?.slice(0, 3));

    console.log('[DEBUG] TobaccoBlend.list() result type:', typeof blendsRaw);
    console.log('[DEBUG] TobaccoBlend.list() is array:', Array.isArray(blendsRaw));
    console.log('[DEBUG] TobaccoBlend.list() total count:', blendCount);
    console.log('[DEBUG] First 3 blends:', blendsRaw?.slice(0, 3));

    return new Response(JSON.stringify({
      pipes: {
        type: typeof pipesRaw,
        isArray: Array.isArray(pipesRaw),
        length: pipeCount,
        sample: Array.isArray(pipesRaw) ? pipesRaw.slice(0, 1) : pipesRaw,
      },
      blends: {
        type: typeof blendsRaw,
        isArray: Array.isArray(blendsRaw),
        length: blendCount,
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