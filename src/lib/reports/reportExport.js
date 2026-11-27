/**
 * reportExport.js
 *
 * One export path for every report in the Reporting Center: CSV for the data,
 * PDF for the printable document, plus the filename convention.
 *
 * The exports read the result object produced by runReport, so they always
 * contain exactly what is on screen — same filters, same generation date.
 */

import { jsPDF } from "jspdf";
import { downloadCsvFile } from "./collectionReportCsv";
import { toNumber } from "./reportModel";

const PAGE = { width: 210, height: 297, margin: 14 };
const INK = "#1f1a15";
const MUTED = "#6b6259";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatCell(value, column) {
  if (value == null || value === "") return "";
  if (column?.format === "currency") {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : String(value);
  }
  if (column?.format === "percent") return `${value}%`;
  if (column?.format === "date") return formatDate(value);
  if (column?.format === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? String(Math.round(number * 100) / 100) : String(value);
  }
  return String(value);
}

function csvCell(value) {
  const text = String(value ?? "");
  const guarded = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function buildReportCsv(result) {
  const rows = [];
  rows.push(["Report", result.title]);
  rows.push(["Description", result.description]);
  rows.push(["Generated", new Date(result.generatedAt).toISOString()]);
  rows.push(["Filters", result.filtersLabel]);
  rows.push(["Records in scope", result.recordCount]);
  rows.push([]);

  if (result.empty) {
    rows.push(["Result", result.empty]);
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  if (result.kpis.length > 0) {
    rows.push(["Summary measure", "Value", "Note"]);
    result.kpis.forEach((kpi) => rows.push([kpi.label, kpi.value, kpi.sub || ""]));
    rows.push([]);
  }

  result.tables.forEach((table) => {
    rows.push([table.title]);
    rows.push(table.columns.map((column) => column.label));
    table.rows.forEach((row) => {
      rows.push(table.columns.map((column) => formatCell(row[column.key], column)));
    });
    if (table.note) rows.push(["Note", table.note]);
    rows.push([]);
  });

  if (result.insights.length > 0) {
    rows.push(["Observation", "Detail"]);
    result.insights.forEach((insight) => rows.push([insight.title, insight.text]));
    rows.push([]);
  }

  if (result.disclosures.length > 0) {
    rows.push(["Disclosure"]);
    result.disclosures.forEach((text) => rows.push([text]));
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadReportCsv(result) {
  downloadCsvFile(buildReportCsv(result), reportFilename(result, "csv"));
}

export function reportFilename(result, extension) {
  const date = new Date(result?.generatedAt || Date.now()).toISOString().slice(0, 10);
  return `collection-report-${result?.id || "report"}-${date}.${extension}`;
}

function addFooter(doc) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`Generated ${new Date().toISOString().slice(0, 10)} · page ${page} of ${pages}`, PAGE.margin, PAGE.height - 8);
  }
}

export function createReportPdf(result) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = PAGE.margin;

  const ensureSpace = (needed = 10) => {
    if (y + needed > PAGE.height - 16) {
      doc.addPage();
      y = PAGE.margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(INK);
  doc.text(result.title, PAGE.margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  const header = doc.splitTextToSize(result.description || "", PAGE.width - PAGE.margin * 2);
  doc.text(header, PAGE.margin, y);
  y += header.length * 4.2 + 2;

  const meta = [
    `Generated: ${new Date(result.generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC`,
    `Filters: ${result.filtersLabel}`,
    `Records in scope: ${result.recordCount}`,
  ];
  meta.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, PAGE.width - PAGE.margin * 2);
    ensureSpace(wrapped.length * 4);
    doc.text(wrapped, PAGE.margin, y);
    y += wrapped.length * 4;
  });
  y += 3;

  if (result.empty) {
    doc.setFontSize(10);
    doc.setTextColor(INK);
    const wrapped = doc.splitTextToSize(result.empty, PAGE.width - PAGE.margin * 2);
    ensureSpace(wrapped.length * 5);
    doc.text(wrapped, PAGE.margin, y);
    addFooter(doc);
    return doc;
  }

  if (result.kpis.length > 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary", PAGE.margin, y);
    y += 6;
    doc.setFontSize(9);
    result.kpis.forEach((kpi) => {
      const line = `${kpi.label}: ${kpi.value}${kpi.sub ? ` (${kpi.sub})` : ""}`;
      const wrapped = doc.splitTextToSize(line, PAGE.width - PAGE.margin * 2);
      ensureSpace(wrapped.length * 4.4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(INK);
      doc.text(wrapped, PAGE.margin, y);
      y += wrapped.length * 4.4;
    });
    y += 3;
  }

  result.tables.forEach((table) => {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(table.title, PAGE.margin, y);
    y += 5.5;

    const usable = PAGE.width - PAGE.margin * 2;
    const widths = table.columns.map(() => usable / table.columns.length);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    let x = PAGE.margin;
    table.columns.forEach((column, index) => {
      doc.text(String(column.label), x + 1, y);
      x += widths[index];
    });
    y += 3.6;
    doc.setDrawColor(200);
    doc.line(PAGE.margin, y - 1.6, PAGE.margin + usable, y - 1.6);

    doc.setTextColor(INK);
    table.rows.slice(0, 200).forEach((row) => {
      const cells = table.columns.map((column, index) => {
        const text = formatCell(row[column.key], column);
        return doc.splitTextToSize(text, widths[index] - 2).slice(0, 3);
      });
      const lineCount = Math.max(...cells.map((cell) => cell.length), 1);
      const rowHeight = lineCount * 3.6 + 1.4;
      ensureSpace(rowHeight + 2);
      let cellX = PAGE.margin;
      cells.forEach((lines, index) => {
        doc.text(lines, cellX + 1, y);
        cellX += widths[index];
      });
      y += rowHeight;
    });

    if (table.rows.length > 200) {
      ensureSpace(5);
      doc.setTextColor(MUTED);
      doc.text(`Showing 200 of ${table.rows.length} rows. Export CSV for the full table.`, PAGE.margin, y);
      y += 4;
    }
    if (table.note) {
      const wrapped = doc.splitTextToSize(table.note, usable);
      ensureSpace(wrapped.length * 3.8 + 2);
      doc.setTextColor(MUTED);
      doc.text(wrapped, PAGE.margin, y);
      y += wrapped.length * 3.8;
    }
    y += 4;
  });

  if (result.insights.length > 0) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text("Observations", PAGE.margin, y);
    y += 5.5;
    doc.setFontSize(9);
    result.insights.forEach((insight) => {
      const wrapped = doc.splitTextToSize(`${insight.title}: ${insight.text}`, PAGE.width - PAGE.margin * 2);
      ensureSpace(wrapped.length * 4.2);
      doc.setFont("helvetica", "normal");
      doc.text(wrapped, PAGE.margin, y);
      y += wrapped.length * 4.2 + 1;
    });
    y += 2;
  }

  if (result.disclosures.length > 0) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text("Disclosures", PAGE.margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    result.disclosures.forEach((text) => {
      const wrapped = doc.splitTextToSize(text, PAGE.width - PAGE.margin * 2);
      ensureSpace(wrapped.length * 4);
      doc.text(wrapped, PAGE.margin, y);
      y += wrapped.length * 4 + 1;
    });
  }

  addFooter(doc);
  return doc;
}

export function downloadReportPdf(result) {
  const doc = createReportPdf(result);
  doc.save(reportFilename(result, "pdf"));
}

export function chartValueTotal(chart) {
  return (chart?.data || []).reduce((sum, row) => sum + toNumber(row.value), 0);
}