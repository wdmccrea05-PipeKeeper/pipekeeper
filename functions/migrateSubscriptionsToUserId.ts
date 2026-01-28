import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default true
    const limit = Math.min(body.limit || 500, 1000);

    let scanned = 0;
    let skippedApple = 0;
    let normalizedEmails = 0;
    let usersCreated = 0;
    let subsLinkedToUserId = 0;
    let usersUpdated = 0;
    let noAuthUser = 0;

    const createdUsers = [];
    const linkedSubs = [];
    const noAuthUserRecords = [];

    // Fetch all subscriptions (or batch if you have cursor support)
    const allSubs = await base44.asServiceRole.entities.Subscription.list('-created_date', limit);
    
    // Fetch all auth users using the SDK (if available)
    let authUserByEmail = new Map();
    
    // Try to get all auth users - use whichever method is available
    try {
      // Try method 1: list users (if available)
      const authUsers = await base44.asServiceRole.auth.listUsers?.() || [];
      authUsers.forEach(u => {
        if (u.email) {
          authUserByEmail.set(normEmail(u.email), u);
        }
      });
    } catch (e) {
      console.warn('[migrateSubscriptionsToUserId] Could not list auth users:', e?.message);
    }
    
    // Fetch all entity Users to build email -> entity user map
    const allEntityUsers = await base44.asServiceRole.entities.User.list();
    const entityUserByEmail = new Map();
    allEntityUsers.forEach(u => {
      if (u.email) {
        entityUserByEmail.set(normEmail(u.email), u);
      }
    });

    for (const sub of allSubs) {
      scanned++;

      // Skip Apple subscriptions (already user_id linked)
      if (sub.provider === 'apple') {
        skippedApple++;
        continue;
      }

      // Skip if already has user_id
      if (sub.user_id) {
        continue;
      }

      const emailRaw = sub.user_email;
      if (!emailRaw) {
        continue;
      }

      const emailLower = normEmail(emailRaw);

      // Normalize email in subscription if needed
      if (emailRaw !== emailLower) {
        normalizedEmails++;
        if (!dryRun) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            user_email: emailLower
          });
        }
      }

      // Try to find auth user by email
      let authUserId = null;
      
      // First check the map we built
      const authUserFromMap = authUserByEmail.get(emailLower);
      if (authUserFromMap?.id) {
        authUserId = authUserFromMap.id;
      }
      
      // If not in map, try to fetch directly (fallback)
      if (!authUserId) {
        try {
          const authUserDirect = await base44.asServiceRole.auth.getUserByEmail?.(emailLower);
          if (authUserDirect?.id) {
            authUserId = authUserDirect.id;
            authUserByEmail.set(emailLower, authUserDirect); // cache it
          }
        } catch (e) {
          // Ignore - no auth user found
        }
      }
      
      if (!authUserId) {
        noAuthUser++;
        noAuthUserRecords.push({ email: emailLower, sub_id: sub.id });
        // Keep email fallback, don't set user_id
        continue;
      }

      // Auth user found - link subscription
      subsLinkedToUserId++;
      linkedSubs.push({
        sub_id: sub.id,
        auth_user_id: authUserId,
        email: emailLower
      });

      if (!dryRun) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          user_id: authUserId,
          user_email: emailLower,
          provider: 'stripe',
          provider_subscription_id: sub.stripe_subscription_id || sub.provider_subscription_id
        });

        // Create or update entity User
        let entityUser = entityUserByEmail.get(emailLower);
        
        if (!entityUser) {
          // Create entity User
          const newEntityUser = await base44.asServiceRole.entities.User.create({
            email: emailLower,
            full_name: `User ${emailLower}`,
            role: 'user',
            subscription_level: 'paid',
            platform: 'web'
          });
          entityUser = newEntityUser;
          entityUserByEmail.set(emailLower, newEntityUser);
          usersCreated++;
          createdUsers.push({ email: emailLower, entity_user_id: newEntityUser.id });
        }
        
        // Update entity User with auth_user_id and subscription info
        const isPaid = sub.status === 'active' || sub.status === 'trialing';
        await base44.asServiceRole.entities.User.update(entityUser.id, {
          subscription_level: isPaid ? 'paid' : 'free',
          subscription_status: sub.status,
          stripe_customer_id: sub.stripe_customer_id || entityUser.stripe_customer_id
        });
        usersUpdated++;
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      scanned,
      skippedApple,
      normalizedEmails,
      usersCreated,
      subsLinkedToUserId,
      usersUpdated,
      noAuthUser,
      createdUsers: createdUsers.slice(0, 10),
      linkedSubs: linkedSubs.slice(0, 10),
      noAuthUserRecords: noAuthUserRecords.slice(0, 10)
    });
  } catch (error) {
    console.error('[migrateSubscriptionsToUserId] error:', error);
    return Response.json({ 
      ok: false,
      error: error?.message || 'Migration failed'
    }, { status: 500 });
  }
});