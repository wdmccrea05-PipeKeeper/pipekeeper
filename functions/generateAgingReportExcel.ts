import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import XLSX from 'npm:xlsx@0.18.5';
import { differenceInMonths } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { startDate, endDate } = payload;

    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });

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
          Blend: b.name,
          Manufacturer: b.manufacturer || 'Unknown',
          'Cellared Date': oldestDate.toLocaleDateString(),
          'Months Aging': months,
          'Total Oz': totalOz.toFixed(2),
          'Aging Potential': b.aging_potential || 'Unknown',
          Status: months >= 24 ? 'Ready' : 'Aging'
        };
      })
      .filter(Boolean)
      .sort((a, b) => parseInt(b['Months Aging']) - parseInt(a['Months Aging']));

    const worksheet = XLSX.utils.json_to_sheet(agingData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aging Report');

    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 }
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=aging-report-${startDate}-to-${endDate}.xlsx`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});