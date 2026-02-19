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

    // Fetch all users and subscriptions
    const [allUsers, allSubscriptions] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Subscription.list()
    ]);

    // Create a map of normalized user email to best subscription (filter out incomplete_expired)
    const subscriptionMap = new Map();
    
    // Group subscriptions by normalized user email OR user_id
    const subsByEmail = new Map();
    const subsByUserId = new Map();
    
    allSubscriptions.forEach(sub => {
      // Index by user_id (primary)
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) {
          subsByUserId.set(sub.user_id, []);
        }
        subsByUserId.get(sub.user_id).push(sub);
      }
      
      // Also index by email (legacy fallback)
      if (sub.user_email) {
        const email = normEmail(sub.user_email);
        if (!subsByEmail.has(email)) {
          subsByEmail.set(email, []);
        }
        subsByEmail.get(email).push(sub);
      }
    });
    
    // Pick best subscription for each user (ignore only incomplete_expired)
    const processSubs = (subs, key) => {
      // Filter out incomplete_expired only
      const validSubs = subs.filter(s => {
        const status = (s.status || '').toLowerCase();
        return status !== 'incomplete_expired';
      });
      
      if (validSubs.length === 0) return;
      
      // Rank: active > trialing > incomplete > past_due > others
      const rank = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };
      
      // Sort and pick best
      const best = [...validSubs].sort((a, b) => {
        const rDiff = rank(b) - rank(a);
        if (rDiff !== 0) return rDiff;
        
        // Prefer pro tier over premium
        const tierA = (a.tier || '').toLowerCase();
        const tierB = (b.tier || '').toLowerCase();
        if (tierB === 'pro' && tierA !== 'pro') return 1;
        if (tierA === 'pro' && tierB !== 'pro') return -1;
        
        // If same rank, pick newest by created_date
        const ca = new Date(a.created_date || 0).getTime();
        const cb = new Date(b.created_date || 0).getTime();
        return cb - ca;
      })[0];
      
      subscriptionMap.set(key, best);
    };
    
    // Process by user_id first
    subsByUserId.forEach(processSubs);
    
    // Then by email as fallback
    subsByEmail.forEach(processSubs);

    // Categorize users
    const paidUsers = [];
    const freeUsers = [];

    allUsers.forEach(user => {
      const email = normEmail(user.email);
      // Check by user ID first, then fall back to email
      const subscription = subscriptionMap.get(user.id) || subscriptionMap.get(email);
      
      // Check if subscription grants premium access
      // 1. Check Subscription entity first
      const subStatus = subscription?.status;
      const subTier = subscription?.tier;
      const subPeriodEnd = subscription?.current_period_end;
      let isPaid = subscription && 
        (subStatus === 'active' || subStatus === 'trialing' || subStatus === 'incomplete') &&
        (!subPeriodEnd || new Date(subPeriodEnd) > new Date()) &&
        (subTier === 'premium' || subTier === 'pro');
      
      // 2. Fallback to User entity fields (for Apple IAP or webhook-synced users)
      if (!isPaid && user.subscription_level === 'paid') {
        isPaid = true;
      }

      const userData = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        platform: user.platform || 'unknown',
        created_date: user.created_date,
        subscription_status: subscription?.status || user.subscription_status || 'none',
        subscription_tier: subscription?.tier || user.subscription_tier || 'none',
        subscription_end: subscription?.current_period_end || null,
        billing_interval: subscription?.billing_interval || null
      };

      if (isPaid) {
        paidUsers.push(userData);
      } else {
        freeUsers.push(userData);
      }
    });

    const totalUsers = allUsers.length;
    const paidCount = paidUsers.length;
    const freeCount = freeUsers.length;
    const paidPercentage = totalUsers === 0 ? '0.0' : ((paidCount / totalUsers) * 100).toFixed(1);

    return Response.json({
      summary: {
        total_users: totalUsers,
        paid_users: paidCount,
        free_users: freeCount,
        paid_percentage: paidPercentage
      },
      paid_users: paidUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
      free_users: freeUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
