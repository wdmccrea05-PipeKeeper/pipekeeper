import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Paginate to avoid timeouts on large datasets
    const PAGE = 200;
    const fetchAll = async (entity) => {
      const results = [];
      let skip = 0;
      while (true) {
        const page = await entity.list(null, PAGE, skip);
        results.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return results;
    };

    const [allUsers, allSubscriptions] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription)
    ]);

    const subscriptionMap = new Map();
    const subsByEmail = new Map();
    const subsByUserId = new Map();

    allSubscriptions.forEach(sub => {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id).push(sub);
      }
      if (sub.user_email) {
        const email = normEmail(sub.user_email);
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email).push(sub);
      }
    });

    const processSubs = (subs, key) => {
      const validSubs = subs.filter(s => {
        const status = (s.status || '').toLowerCase();
        return status !== 'incomplete_expired';
      });
      if (validSubs.length === 0) return;

      const rank = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };

      const best = [...validSubs].sort((a, b) => {
        const rDiff = rank(b) - rank(a);
        if (rDiff !== 0) return rDiff;
        const tierA = (a.tier || '').toLowerCase();
        const tierB = (b.tier || '').toLowerCase();
        if (tierB === 'pro' && tierA !== 'pro') return 1;
        if (tierA === 'pro' && tierB !== 'pro') return -1;
        const ca = new Date(a.created_date || 0).getTime();
        const cb = new Date(b.created_date || 0).getTime();
        return cb - ca;
      })[0];

      subscriptionMap.set(key, best);
    };

    subsByUserId.forEach(processSubs);
    subsByEmail.forEach(processSubs);

    const paidUsers = [];
    const freeUsers = [];

    allUsers.forEach(u => {
      const email = normEmail(u.email);
      const subscription = subscriptionMap.get(u.id) || subscriptionMap.get(email);

      let isPaid = false;
      let effectiveStatus = 'none';
      let effectiveTier = 'none';

      if (subscription) {
        const subStatus = (subscription.status || '').toLowerCase();
        const subTier = subscription.tier || 'premium';
        const subPeriodEnd = subscription.current_period_end;
        const isActiveStatus = ['active', 'trialing', 'trial', 'incomplete'].includes(subStatus);
        const notExpired = !subPeriodEnd || new Date(subPeriodEnd) > new Date();
        if (isActiveStatus && notExpired) {
          isPaid = true;
          effectiveStatus = subscription.status;
          effectiveTier = subTier;
        } else {
          effectiveStatus = subscription.status;
        }
      }

      if (!isPaid && u.data) {
        const entitlementTier = (u.data.entitlement_tier || '').toLowerCase();
        const subscriptionTier = (u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(entitlementTier)) {
          isPaid = true;
          effectiveTier = entitlementTier;
          effectiveStatus = u.data.subscription_status || 'active';
        } else if (!entitlementTier && ['premium', 'pro'].includes(subscriptionTier)) {
          isPaid = true;
          effectiveTier = subscriptionTier;
          effectiveStatus = u.data.subscription_status || 'active';
        }
      }

      if (!isPaid) {
        const userSubLevel = (u.subscription_level || '').toLowerCase();
        if (['paid', 'premium', 'pro'].includes(userSubLevel)) {
          isPaid = true;
          effectiveStatus = u.subscription_status || 'active';
          effectiveTier = userSubLevel === 'paid' ? 'premium' : userSubLevel;
        }
      }

      const userData = {
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        platform: u.data?.platform || u.platform || 'web',
        created_date: u.created_date,
        subscription_status: effectiveStatus,
        subscription_tier: effectiveTier,
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

    const sortedPaid = paidUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const sortedFree = freeUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({
      summary: { total_users: totalUsers, paid_users: paidCount, free_users: freeCount, paid_percentage: paidPercentage },
      paid_users: sortedPaid,
      free_users: sortedFree.slice(0, 500),  // Cap at 500 to prevent payload overload
      free_users_truncated: sortedFree.length > 500,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});