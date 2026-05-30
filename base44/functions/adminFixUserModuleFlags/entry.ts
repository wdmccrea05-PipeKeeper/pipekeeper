import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_email, modules } = await req.json();
    if (!target_email || !modules) {
      return Response.json({ error: 'target_email and modules array required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const currentData = targetUser.data || {};
    const currentInnerData = currentData.data || {};

    const moduleFlags = {
      pipekeeper_paid: modules.includes('pipekeeper'),
      whiskeykeeper_paid: modules.includes('whiskeykeeper'),
      cigarkeeper_paid: modules.includes('cigarkeeper'),
      winekeeper_paid: modules.includes('winekeeper'),
    };

    const paid_modules_csv = modules.join(',');
    const sharedFields = {
      ...moduleFlags,
      paid_modules_csv,
      has_paid_access: modules.length > 0,
      subscription_level: 'paid',
      subscription_status: 'active',
      entitlement_tier: 'premium',
      entitlement_sync_state: 'synced',
    };

    // Update both the outer data layer (read by frontend) and inner data.data layer (written by backend)
    const updatedData = {
      ...currentData,
      ...sharedFields,
      data: {
        ...currentInnerData,
        ...sharedFields,
      },
    };

    await base44.asServiceRole.entities.User.update(targetUser.id, { data: updatedData });

    return Response.json({
      ok: true,
      email: target_email,
      modules_granted: modules,
      flags_set: moduleFlags,
      paid_modules_csv,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});