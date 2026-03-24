import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Smoking Log Report', 20, 20);
    doc.setFontSize(10);
    doc.text(`${startDate} to ${endDate}`, 20, 30);

    let y = 45;
    doc.setFontSize(11);
    doc.text('Date', 20, y);
    doc.text('Pipe', 60, y);
    doc.text('Tobacco', 110, y);
    doc.text('Bowls', 160, y);

    y += 10;
    doc.setFontSize(10);

    filteredLogs.forEach(log => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      let logDate = 'Invalid Date';
      try {
        const parsed = new Date(log.date);
        if (!isNaN(parsed.getTime())) {
          logDate = parsed.toLocaleDateString();
        }
      } catch {
        // use fallback
      }
      
      doc.text(logDate, 20, y);
      doc.text(log.pipe_name || 'Unknown', 60, y);
      doc.text(log.blend_name || 'Unknown', 110, y);
      doc.text(String(log.bowls_used || log.bowls_smoked || 1), 160, y);

      // Notes are intentionally included in personal exports (not shown on public profiles)
      if (log.notes) {
        y += 5;
        const noteText = `Notes: ${log.notes}`;
        const wrappedText = doc.splitTextToSize(noteText, 150);
        doc.setFontSize(8);
        doc.text(wrappedText, 20, y);
        doc.setFontSize(10);
        y += wrappedText.length * 4;
      }

      y += 8;
    });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=smoking-log-${startDate}-to-${endDate}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});