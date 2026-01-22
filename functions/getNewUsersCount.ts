import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate 7 days ago from today
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    // Use service role to query users created in past 7 days
    const newUsers = await base44.asServiceRole.entities.User.filter({
      created_date: { "$gte": cutoffDate }
    });

    return Response.json({ 
      count: newUsers.length,
      cutoffDate
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});