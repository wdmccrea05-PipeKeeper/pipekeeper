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
    let conflicts = 0;

    const createdUsers = [];
    const linkedSubs = [];
    const mismatches = [];

    // Fetch all subscriptions (or batch if you have cursor support)
    const allSubs = await base44.asServiceRole.entities.Subscription.list('-created_date', limit);
    
    // Fetch all users once to build email -> user_id map
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userByEmail = new Map();
    allUsers.forEach(u => {
      if (u.email) {
        userByEmail.set(normEmail(u.email), u);
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

      // Find or create User entity
      let targetUser = userByEmail.get(emailLower);
      
      if (!targetUser) {
        // User doesn't exist - create one
        usersCreated++;
        createdUsers.push({ email: emailLower, sub_id: sub.id });
        
        if (!dryRun) {
          const newUser = await base44.asServiceRole.entities.User.create({
            email: emailLower,
            full_name: `User ${emailLower}`,
            subscription_level: 'paid',
            platform: 'web'
          });
          targetUser = newUser;
          userByEmail.set(emailLower, newUser);
        }
      }

      // Link subscription to user_id
      if (targetUser?.id) {
        subsLinkedToUserId++;
        linkedSubs.push({
          sub_id: sub.id,
          user_id: targetUser.id,
          email: emailLower
        });

        if (!dryRun) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            user_id: targetUser.id,
            user_email: emailLower
          });

          // Update User entity with subscription info
          const isPaid = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'incomplete';
          await base44.asServiceRole.entities.User.update(targetUser.id, {
            subscription_level: isPaid ? 'paid' : 'free',
            subscription_status: sub.status,
            stripe_customer_id: sub.stripe_customer_id || targetUser.stripe_customer_id
          });
          usersUpdated++;
        }
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
      conflicts,
      createdUsers: createdUsers.slice(0, 10),
      linkedSubs: linkedSubs.slice(0, 10),
      mismatches: mismatches.slice(0, 10)
    });
  } catch (error) {
    console.error('[migrateSubscriptionsToUserId] error:', error);
    return Response.json({ 
      ok: false,
      error: error?.message || 'Migration failed'
    }, { status: 500 });
  }
});