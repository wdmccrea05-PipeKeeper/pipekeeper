import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page0 = await base44.asServiceRole.entities.UserProfile.list(null, 5, 0);
    const page1 = await base44.asServiceRole.entities.UserProfile.list(null, 5, 5);
    const page2 = await base44.asServiceRole.entities.UserProfile.list(null, 200, 0);

    return Response.json({
      page0_type: typeof page0,
      page0_isArray: Array.isArray(page0),
      page0_length: Array.isArray(page0) ? page0.length : String(page0).length,
      page1_type: typeof page1,
      page1_isArray: Array.isArray(page1),
      page1_length: Array.isArray(page1) ? page1.length : String(page1).length,
      page2_type: typeof page2,
      page2_isArray: Array.isArray(page2),
      page2_length: Array.isArray(page2) ? page2.length : String(page2).length,
      page0_sample: Array.isArray(page0) ? page0[0] : null,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});