import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import XLSX from 'npm:xlsx@0.18.5';

// Inlined requireEntitlement function
function normEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

async function requireEntitlement(base44: any, user: any, _feature: string): Promise<void> {
  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  const email = normEmail(user.email);

  const isActive = (s: any): boolean => {
    const status = String(s?.status || "").toLowerCase();
    if (status === "active" || status === "trialing") return true;
    
    if (status === "incomplete") {
      const periodEnd = s?.current_period_end;
      return periodEnd && new Date(periodEnd).getTime() > Date.now();
    }
    
    return false;
  };

  try {
    const byUserId = await base44.entities.Subscription.filter({ user_id: user.id });
    if (Array.isArray(byUserId) && byUserId.some(isActive)) {
      return;
    }
  } catch (e) {
    console.warn("[requireEntitlement] user_id lookup failed:", e);
  }

  if (email) {
    try {
      const byEmail = await base44.entities.Subscription.filter({ 
        provider: "stripe", 
        user_email: email 
      });
      if (Array.isArray(byEmail) && byEmail.some(isActive)) {
        return;
      }
    } catch (e) {
      console.warn("[requireEntitlement] email lookup failed:", e);
    }
  }

  try {
    const users = await base44.entities.User.filter({ email });
    const u = Array.isArray(users) ? users[0] : null;
    if (u?.subscription_level === "paid") {
      return;
    }
  } catch (e) {
    console.warn("[requireEntitlement] User entity fallback failed:", e);
  }

  throw new Error("NO_ENTITLEMENT");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireEntitlement(base44, user, 'EXPORT_REPORTS');

    const payload = await req.json();
    const { startDate, endDate } = payload;

    const smokingLogs = await base44.entities.SmokingLog.filter({ created_by: user.email });
    
    const filteredLogs = smokingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const rows = filteredLogs.map(log => ({
      Date: new Date(log.date).toLocaleDateString(),
      Pipe: log.pipe_name || 'Unknown',
      Tobacco: log.blend_name || 'Unknown',
      Bowls: log.bowls_smoked || 1,
      Notes: log.notes || ''
    }));

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