/**
 * Flat CSV export for the collection report.
 * One file, one Section column, so Excel opens every report in a single sheet.
 */
export function buildCollectionReportCsv(report) {
  const rows = [["Section", "Module", "Item", "Subitem", "Score", "Detail"]];

  (report?.pairingChart || []).forEach((row) => {
    rows.push([
      "Pipe Pairing Chart",
      "pipe",
      row.name,
      "Specialization",
      "",
      [row.specialization, row.chamber].filter(Boolean).join(" · "),
    ]);
    (row.matches || []).forEach((match, index) => {
      rows.push([
        "Pipe Pairing Chart",
        "pipe",
        row.name,
        `${index + 1}. ${match.blendName}`,
        match.score,
        [match.manufacturer, match.blendType, match.why].filter(Boolean).join(" · "),
      ]);
    });
  });

  (report?.topMatches || []).forEach((group) => {
    (group.entries || []).forEach((entry, index) => {
      rows.push([
        `Top Matches — ${group.label}`,
        group.key,
        `${index + 1}. ${entry.name}`,
        entry.detail || "",
        entry.score,
        entry.explanation || "",
      ]);
    });
  });

  (report?.complementary || []).forEach((group) => {
    (group.entries || []).forEach((entry) => {
      rows.push([
        `Complementary — ${group.title}`,
        entry.meta || "",
        entry.title,
        "",
        "",
        entry.detail || "",
      ]);
    });
  });

  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

export function downloadCsvFile(csv, filename) {
  // BOM keeps accented names readable in Excel.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function collectionReportFilename(extension) {
  return `collection-report-${new Date().toISOString().split("T")[0]}.${extension}`;
}