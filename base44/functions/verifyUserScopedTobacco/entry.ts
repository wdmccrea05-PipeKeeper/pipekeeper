/**
 * Verification function to prove Tobacco list is user-scoped
 * Shows list size for authenticated user's collection
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`[VERIFY] User: ${user.email}`);

    // Fetch user's tobacco collection (user-scoped)
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    const blendCount = Array.isArray(blends) ? blends.length : 0;

    console.log(`[VERIFY] Tobacco blends for ${user.email}: ${blendCount}`);

    // Show sample if available
    let sample = null;
    if (blendCount > 0 && Array.isArray(blends) && blends[0]) {
      sample = {
        id: blends[0].id,
        name: blends[0].name,
        created_by: blends[0].created_by,
      };
    }

    const result = {
      status: 'OK',
      user_email: user.email,
      user_id: user.id,
      tobacco_count: blendCount,
      query_scope: 'created_by',
      scope_value: user.email,
      sample: sample,
      timestamp: new Date().toISOString(),
    };

    console.log(`[VERIFY] Result:`, JSON.stringify(result, null, 2));

    return Response.json(result);
  } catch (err) {
    console.error('[VERIFY ERROR]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});