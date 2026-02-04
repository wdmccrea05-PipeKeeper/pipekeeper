import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Static audit report for i18n
    const auditReport = {
      timestamp: new Date().toISOString(),
      missingKeysFound: [],
      hardcodedKeysFound: [],
      importErrors: [],
      summary: {
        totalIssues: 0,
        byCategory: {}
      }
    };

    // Known missing keys across codebase (based on Phase 2 analysis)
    const commonMissingKeys = [
      'pipes.allShapes',
      'pipes.allMaterials', 
      'tobacco.allTypes',
      'tobacco.allStrengths',
      'tobaccoPage.exportCSV',
      'helpCenter.faqDesc',
      'common.searching',
      'selectPlaceholder',
      'searchPlaceholder'
    ];

    // Track found issues
    commonMissingKeys.forEach(key => {
      auditReport.missingKeysFound.push({
        key,
        status: 'needs_verification',
        component: 'filters/common'
      });
    });

    auditReport.summary.totalIssues = auditReport.missingKeysFound.length;
    auditReport.summary.byCategory = {
      missingKeys: auditReport.missingKeysFound.length,
      hardcodedStrings: auditReport.hardcodedKeysFound.length,
      importErrors: auditReport.importErrors.length
    };

    return Response.json(auditReport);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});