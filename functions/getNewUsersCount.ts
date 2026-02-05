import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate 7 days ago from today
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    // Fetch all users and filter client-side
    const allUsers = await base44.asServiceRole.entities.User.list();
    const newUsers = allUsers.filter(u => {
      const userDate = new Date(u.created_date);
      return userDate >= sevenDaysAgo;
    });

    return Response.json({ 
      count: newUsers.length,
      cutoffDate
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});