export function exportContractsCsv(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const headers = [
    'user_id',
    'provider',
    'product',
    'modules',
    'interval',
    'amount',
    'renewal_date',
  ];

  const lines = [
    headers.join(','),
    ...safeRows.map((r) =>
      [
        r.user_id,
        r.provider,
        r.product,
        `"${(Array.isArray(r.modules) ? r.modules : []).join('|')}"`,
        r.interval,
        r.amount,
        r.renewal_date || '',
      ].join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'user-report.csv';
  a.click();
}
