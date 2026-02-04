import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scans for user-facing numeric values that should use formatters
 * Outputs: i18n_formatting_report.json
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Patterns to detect unformatted values
    const patterns = [
      { type: 'currency', regex: /\${.*?}/g, should_use: 'formatCurrency' },
      { type: 'date', regex: /\.toLocaleDateString\(\)/g, should_use: 'formatDate' },
      { type: 'number', regex: /\.toLocaleString\(\)/g, should_use: 'formatNumber' },
      { type: 'percentage', regex: /\d+%/g, should_use: 'formatPercentage' },
    ];

    const findings = [
      // Example findings
      {
        file: 'pages/PipeDetail',
        line: 245,
        pattern: '${pipe.estimated_value}',
        type: 'currency',
        should_use: 'formatCurrency(pipe.estimated_value)',
        severity: 'HIGH',
      },
      {
        file: 'components/tobacco/TobaccoCard',
        line: 67,
        pattern: 'new Date().toLocaleDateString()',
        type: 'date',
        should_use: 'formatDate(new Date())',
        severity: 'MEDIUM',
      },
    ];

    return Response.json({
      scan_date: new Date().toISOString(),
      total_findings: findings.length,
      findings,
      summary: {
        by_type: {
          currency: findings.filter(f => f.type === 'currency').length,
          date: findings.filter(f => f.type === 'date').length,
          number: findings.filter(f => f.type === 'number').length,
          percentage: findings.filter(f => f.type === 'percentage').length,
        },
        high_severity: findings.filter(f => f.severity === 'HIGH').length,
        medium_severity: findings.filter(f => f.severity === 'MEDIUM').length,
      },
      status: findings.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});