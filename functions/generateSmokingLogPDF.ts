import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { requireEntitlement } from './_auth/requireEntitlement.js';

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

      const logDate = new Date(log.date).toLocaleDateString();
      doc.text(logDate, 20, y);
      doc.text(log.pipe_name || 'Unknown', 60, y);
      doc.text(log.blend_name || 'Unknown', 110, y);
      doc.text(String(log.bowls_smoked || 1), 160, y);

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