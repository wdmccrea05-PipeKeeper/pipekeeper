import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { subscription_id } = await req.json();
    
    if (!subscription_id) {
      return Response.json({ error: 'subscription_id required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Subscription.delete(subscription_id);

    return Response.json({ success: true, deleted_id: subscription_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});