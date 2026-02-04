{
  "findings": [
    {
      "file": "pages/Home.js",
      "line": 532,
      "code": "${totalPipeValue.toLocaleString()}",
      "type": "currency",
      "issue": "Uses $ prefix and toLocaleString() instead of formatCurrency()",
      "recommended_fix": "formatCurrency(totalPipeValue)"
    },
    {
      "file": "pages/Home.js",
      "line": 594,
      "code": "{totalCellaredOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed(), no locale support",
      "recommended_fix": "Use formatWeight() with user's measurement preference"
    },
    {
      "file": "pages/Home.js",
      "line": 604,
      "code": "≈ ${totalValue.toFixed(0)}",
      "type": "currency",
      "issue": "Hard-coded $ prefix with toFixed()",
      "recommended_fix": "formatCurrency(totalValue)"
    },
    {
      "file": "pages/Home.js",
      "line": 732,
      "code": "${pipe.estimated_value}",
      "type": "currency",
      "issue": "Hard-coded $ prefix without locale formatting",
      "recommended_fix": "formatCurrency(pipe.estimated_value)"
    },
    {
      "file": "pages/Home.js",
      "line": 865,
      "code": "({totalCellaredOz.toFixed(1)} oz)",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed()",
      "recommended_fix": "formatWeight(totalCellaredOz * 28.35, useImperial)"
    },
    {
      "file": "pages/Home.js",
      "line": 885,
      "code": "{item.totalOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed()",
      "recommended_fix": "formatWeight(item.totalOz * 28.35, useImperial)"
    },
    {
      "file": "pages/Pipes.js",
      "line": 177,
      "code": "formatCurrency(totalValue)",
      "type": "currency",
      "issue": "CORRECT - already using formatter ✓",
      "recommended_fix": "N/A"
    },
    {
      "file": "components/pipes/PipeCard.jsx",
      "line": 56,
      "code": "formatCurrency(+pipe.estimated_value)",
      "type": "currency",
      "issue": "CORRECT - already using formatter ✓",
      "recommended_fix": "N/A"
    },
    {
      "file": "components/tobacco/TobaccoCard.jsx",
      "line": 90,
      "code": "formatWeight(+(blend.tin_total_quantity_oz || 0))",
      "type": "unit",
      "issue": "PARTIALLY CORRECT - uses formatWeight but may not respect user preference",
      "recommended_fix": "Pass useImperial from user preferences"
    },
    {
      "file": "components/tobacco/TobaccoCard.jsx",
      "line": 94,
      "code": "formatWeight(...)",
      "type": "unit",
      "issue": "PARTIALLY CORRECT - needs user preference",
      "recommended_fix": "Pass useImperial from MeasurementContext"
    },
    {
      "file": "components/tobacco/TobaccoCard.jsx",
      "line": 99,
      "code": "formatWeight(...)",
      "type": "unit",
      "issue": "PARTIALLY CORRECT - needs user preference",
      "recommended_fix": "Pass useImperial from MeasurementContext"
    },
    {
      "file": "components/tobacco/TobaccoCard.jsx",
      "line": 149,
      "code": "{(+blend.rating).toFixed(1)}/5",
      "type": "number",
      "issue": "Hard-coded decimal formatting and '/5' suffix",
      "recommended_fix": "formatNumber(blend.rating, locale, 1) + t('units.outOf5')"
    },
    {
      "file": "pages/Tobacco.js",
      "line": 261,
      "code": "{blends.length} ... {totalTins}",
      "type": "number",
      "issue": "Raw number display without locale formatting",
      "recommended_fix": "formatNumber(blends.length, locale) and formatNumber(totalTins, locale)"
    }
  ],
  "summary": {
    "total_findings": 11,
    "by_type": {
      "currency": 4,
      "unit": 6,
      "number": 2,
      "date": 0,
      "percent": 0
    },
    "correct_usage": 2,
    "needs_fix": 9
  },
  "notes": [
    "2 files already using formatCurrency() correctly ✓",
    "formatWeight() used in TobaccoCard but needs user measurement preference passed",
    "Home.js has most currency/unit formatting issues (6 occurrences)",
    "No date formatting issues found (likely using formatDate already)",
    "Need to add missing unit translation keys: units.outOf5, units.tin, units.tinPlural"
  ]
}