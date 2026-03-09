{
  "findings": [
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateStatsCSV",
      "code": "$${totalValue.toLocaleString()}",
      "type": "currency",
      "issue": "Used $ prefix and toLocaleString() instead of formatCurrency()",
      "recommended_fix": "formatCurrency(totalValue)",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateStatsCSV",
      "code": "${totalOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed(), no locale support",
      "recommended_fix": "formatWeight(totalOz, 'oz')",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateStatsPDF",
      "code": "$${totalValue.toLocaleString()}",
      "type": "currency",
      "issue": "Hard-coded $ prefix with toLocaleString()",
      "recommended_fix": "formatCurrency(totalValue)",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateStatsPDF",
      "code": "${totalOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed()",
      "recommended_fix": "formatWeight(totalOz, 'oz')",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generatePipePDF",
      "code": "$${totalValue.toLocaleString()}",
      "type": "currency",
      "issue": "Hard-coded $ prefix with toLocaleString()",
      "recommended_fix": "formatCurrency(totalValue)",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateTobaccoPDF",
      "code": "${totalOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed()",
      "recommended_fix": "formatWeight(totalOz, 'oz')",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateTobaccoPDF",
      "code": "${cellaredOz.toFixed(1)} oz",
      "type": "unit",
      "issue": "Hard-coded oz unit with toFixed()",
      "recommended_fix": "formatWeight(cellaredOz, 'oz')",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateInsuranceCSV",
      "code": "$${totalValue.toLocaleString()}",
      "type": "currency",
      "issue": "Hard-coded $ prefix with toLocaleString()",
      "recommended_fix": "formatCurrency(totalValue)",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateInsurancePDF",
      "code": "$${totalValue.toLocaleString()}",
      "type": "currency",
      "issue": "Hard-coded $ prefix with toLocaleString()",
      "recommended_fix": "formatCurrency(totalValue)",
      "status": "FIXED"
    },
    {
      "file": "src/components/export/CollectionReportExporter.jsx",
      "function": "generateStatsCSV",
      "code": "$${pipes.length > 0 ? Math.round(totalValue / pipes.length) : 0}",
      "type": "currency",
      "issue": "Hard-coded $ prefix without locale formatting for average value",
      "recommended_fix": "formatCurrency(Math.round(totalValue / pipes.length))",
      "status": "FIXED"
    }
  ],
  "summary": {
    "total_findings": 10,
    "by_type": {
      "currency": 6,
      "unit": 4,
      "number": 0,
      "date": 0,
      "percent": 0
    },
    "correct_usage": 0,
    "needs_fix": 0,
    "fixed": 10
  },
  "notes": [
    "All 10 locale-formatting violations in CollectionReportExporter.jsx have been fixed.",
    "formatCurrency() and formatWeight() are now imported from @/components/utils/localeFormatters.",
    "All hardcoded $ prefixes and .toLocaleString()/.toFixed() calls replaced with canonical formatters."
  ]
}