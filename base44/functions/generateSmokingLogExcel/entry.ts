import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for premium access (basic entitlement check)
    const isActiveStatus = (s) => {
      const status = String(s?.status || '').toLowerCase();
      return status === 'active' || status === 'trialing' || status === 'trial';
    };

    let hasPremium = false;
    
    try {
      const subs = await base44.entities.Subscription.filter({ user_id: user.id });
      if (Array.isArray(subs) && subs.some(isActiveStatus)) {
        hasPremium = true;
      }
    } catch {}
    
    if (!hasPremium && user?.email) {
      try {
        const emailSubs = await base44.entities.Subscription.filter({ 
          provider: 'stripe', 
          user_email: user.email.toLowerCase() 
        });
        if (Array.isArray(emailSubs) && emailSubs.some(isActiveStatus)) {
          hasPremium = true;
        }
      } catch {}
    }

    if (!hasPremium) {
      return Response.json({ error: 'Premium subscription required for exports' }, { status: 403 });
    }

    const payload = await req.json();
    const { startDate, endDate } = payload;

    const smokingLogs = await base44.entities.SmokingLog.filter({ created_by: user.email });
    
    if (!smokingLogs || smokingLogs.length === 0) {
      return Response.json({ 
        error: 'No smoking log entries available to export. Please log some sessions first.' 
      }, { status: 400 });
    }
    
    const filteredLogs = smokingLogs.filter(log => {
      try {
        const logDate = new Date(log.date);
        if (isNaN(logDate.getTime())) return false;
        return logDate >= new Date(startDate) && logDate <= new Date(endDate);
      } catch {
        return false;
      }
    }).sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch {
        return 0;
      }
    });

    if (filteredLogs.length === 0) {
      return Response.json({ 
        error: 'No smoking sessions found in the selected date range. Try expanding your date range.' 
      }, { status: 400 });
    }

    const rows = filteredLogs.map(log => {
      let dateStr = 'Invalid Date';
      try {
        const parsed = new Date(log.date);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toLocaleDateString();
        }
      } catch {
        // use fallback
      }
      
      return {
        Date: dateStr,
        Pipe: log.pipe_name || 'Unknown',
        Tobacco: log.blend_name || 'Unknown',
        Bowls: log.bowls_used || log.bowls_smoked || 1,
        Notes: log.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Smoking Log');

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 8 },
      { wch: 40 }
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=smoking-log-${startDate}-to-${endDate}.xlsx`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});