import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailLower = normEmail(authUser.email);
    const userId = authUser.id;
    
    const body = await req.json().catch(() => ({}));
    const platformFromBody = body.platform || 'web';

    // Check if User entity exists by email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emailLower });
    
    if (existingUsers && existingUsers.length > 0) {
      // User exists - update platform if missing
      const existing = existingUsers[0];
      if (!existing.platform && platformFromBody) {
        await base44.asServiceRole.entities.User.update(existing.id, {
          platform: platformFromBody
        });
        return Response.json({ 
          ok: true, 
          user: { ...existing, platform: platformFromBody },
          user_id: userId,
          updated: true
        });
      }
      return Response.json({ 
        ok: true, 
        user: existing,
        user_id: userId, 
        updated: false 
      });
    }

    // User doesn't exist - create with service role
    const newUser = await base44.asServiceRole.entities.User.create({
      email: emailLower,
      full_name: authUser.full_name || authUser.name || null,
      platform: platformFromBody || 'web',
      subscription_level: authUser.subscription_level || 'free',
      subscription_status: authUser.subscription_status || 'none',
      role: authUser.role || 'user'
    });

    return Response.json({ 
      ok: true, 
      user: newUser,
      user_id: userId, 
      created: true 
    });
  } catch (error) {
    console.error('[ensureUserRecord] error:', error);
    return Response.json({ 
      error: error?.message || 'Failed to ensure user record',
      stack: error?.stack
    }, { status: 500 });
  }
});