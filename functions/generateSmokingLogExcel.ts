import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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