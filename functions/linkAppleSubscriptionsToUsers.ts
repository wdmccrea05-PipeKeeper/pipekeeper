// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[linkAppleSubscriptionsToUsers] Starting repair for Apple subscriptions');

    // Get all Apple subscriptions without user_id
    const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
      provider: 'apple'
    });
    
    let linked = 0;
    let notFound = 0;
    let errors = 0;
    const results = [];

    for (const sub of appleSubs) {
      try {
        // Skip if already has user_id
        if (sub.data?.user_id) {
          continue;
        }

        const email = (sub.data?.user_email || '').toLowerCase();
        if (!email) {
          notFound++;
          results.push({
            subscription_id: sub.id,
            status: 'no_email',
            issue: 'Subscription has no user_email'
          });
          continue;
        }

        // Find user by email
        const users = await base44.asServiceRole.entities.User.filter({ email });
        
        if (!users || users.length === 0) {
          notFound++;
          results.push({
            subscription_id: sub.id,
            email,
            status: 'user_not_found'
          });
          continue;
        }

        const matchedUser = users[0];
        
        console.log(`[linkAppleSubscriptionsToUsers] Linking subscription ${sub.id} to user ${matchedUser.id}`);

        // Update subscription with user_id
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          data: {
            ...sub.data,
            user_id: matchedUser.id
          }
        });

        linked++;
        results.push({
          subscription_id: sub.id,
          email,
          user_id: matchedUser.id,
          status: 'linked'
        });

      } catch (err) {
        errors++;
        results.push({
          subscription_id: sub.id,
          status: 'error',
          error: err.message
        });
        console.error(`[linkAppleSubscriptionsToUsers] Failed for subscription ${sub.id}:`, err);
      }
    }

    return Response.json({
      ok: true,
      summary: {
        total: appleSubs.length,
        linked,
        notFound,
        errors,
        alreadyLinked: appleSubs.length - linked - notFound - errors
      },
      results: results.slice(0, 100)
    });

  } catch (error) {
    console.error('[linkAppleSubscriptionsToUsers] Error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
});