import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { differenceInMonths } from 'npm:date-fns@3.6.0';
import { requireEntitlement } from './_auth/requireEntitlement.ts';

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

    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    const cellarLogs = await base44.entities.CellarLog.filter({ created_by: user.email });

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const cellaredBlends = blends.filter(b => {
      const hasCellared = (b.tin_tins_cellared || 0) > 0 || 
                          (b.bulk_cellared || 0) > 0 || 
                          (b.pouch_pouches_cellared || 0) > 0;
      return hasCellared;
    });

    const agingData = cellaredBlends
      .map(b => {
        const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
        const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null;
        
        if (!oldestDate || oldestDate < startDateObj || oldestDate > endDateObj) return null;

        const months = differenceInMonths(new Date(), oldestDate);
        const totalOz = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);

        return {
          name: b.name,
          manufacturer: b.manufacturer || 'Unknown',
          oldest_date: oldestDate.toLocaleDateString(),
          months_aging: months,
          total_oz: totalOz,
          aging_potential: b.aging_potential || 'Unknown',
          status: months >= 24 ? 'Ready' : 'Aging'
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.months_aging - a.months_aging);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Tobacco Aging Report', 20, 20);
    doc.setFontSize(10);
    doc.text(`Cellared between ${startDate} and ${endDate}`, 20, 30);

    let y = 45;
    doc.setFontSize(11);
    doc.text('Blend', 20, y);
    doc.text('Cellared', 70, y);
    doc.text('Months', 110, y);
    doc.text('Oz', 140, y);
    doc.text('Status', 160, y);

    y += 10;
    doc.setFontSize(9);

    agingData.forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(item.name.substring(0, 30), 20, y);
      doc.text(item.oldest_date, 70, y);
      doc.text(String(item.months_aging), 110, y);
      doc.text(item.total_oz.toFixed(1), 140, y);
      doc.text(item.status, 160, y);

      y += 7;
    });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=aging-report-${startDate}-to-${endDate}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});