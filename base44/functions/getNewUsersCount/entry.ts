import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    // Calculate 7 days ago from today
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    // The cutoff is applied in the read itself (count is not available on User)
    const newUsers = await base44.asServiceRole.entities.User.filter(
      { created_date: { $gte: cutoffDate } },
      '-created_date',
      5000,
      0
    );
    const newUserCount = Array.isArray(newUsers) ? newUsers.length : 0;

    return Response.json({ 
      count: newUserCount,
      cutoffDate
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});