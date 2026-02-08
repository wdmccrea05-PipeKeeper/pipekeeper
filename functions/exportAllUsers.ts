import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verify admin access (check role OR hardcoded admin emails)
    const isAdmin = user?.role === 'admin' || 
      (user?.email && ['wmccrea@indario.com', 'warren@pipekeeper.app'].includes((user?.email || '').trim().toLowerCase()));
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all users
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    
    if (!Array.isArray(allUsers) || allUsers.length === 0) {
      return new Response(
        'No users found',
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="users_export.csv"'
          } 
        }
      );
    }

    // Get all unique field keys
    const allKeys = new Set();
    allUsers.forEach(u => {
      Object.keys(u).forEach(k => allKeys.add(k));
    });
    
    const headers = Array.from(allKeys).sort();

    // Build CSV
    const csvLines = [];
    
    // Header row
    csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    // Data rows
    allUsers.forEach(user => {
      const row = headers.map(h => {
        const val = user[h];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvLines.push(row.join(','));
    });

    const csv = csvLines.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="users_export.csv"'
      }
    });
  } catch (error) {
    console.error('[exportAllUsers]', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});