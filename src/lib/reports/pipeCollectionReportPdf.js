/**
 * Printable PDF for the PipeKeeper and cellar reports.
 *
 * White paper, dark ink, one section per report. Rendered from the same report
 * objects the screen uses, so print and screen can never disagree.
 */
import jsPDF from "jspdf";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 18;

const INK = [31, 27, 22];
const MUTED = [111, 103, 92];
const GOLD = [180, 140, 75];
const RULE = [222, 214, 202];

function ensureSpace(doc, y, needed) {
  if (y + needed > BOTTOM) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function writeWrapped(doc, text, x, y, width, { size = 8, color = MUTED, bold = false } = {}) {
  if (!text) return y;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(text), width);
  lines.forEach((line) => {
    y = ensureSpace(doc, y, 5);
    doc.text(line, x, y);
    y += size * 0.42 + 1.6;
  });
  return y;
}

function renderTable(doc, table, y) {
  if (!table?.rows?.length) return y;
  y = ensureSpace(doc, y, 12);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 5;

  table.rows.forEach((row) => {
    y = ensureSpace(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...INK);
    const labelLines = doc.splitTextToSize(String(row.label || ''), CONTENT_W - 34);
    labelLines.forEach((line) => {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN, y);
      y += 4.4;
    });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const valueLines = doc.splitTextToSize(String(row.value ?? ''), 30);
    let valueY = y - labelLines.length * 4.4;
    valueLines.forEach((line) => {
      doc.text(line, MARGIN + CONTENT_W - 30, valueY);
      valueY += 4;
    });
    y = Math.max(y, valueY) + 1.4;
  });
  return y + 2;
}

function renderReport(doc, report, y, isFirst) {
  if (!isFirst) {
    doc.addPage();
    y = MARGIN + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(report.title, MARGIN, y);
  y += 7;

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN + 26, y);
  y += 7;

  y = writeWrapped(doc, report.description, MARGIN, y, CONTENT_W, { size: 8.4 });

  const summary = (report.summary || []).map((item) => `${item.label}: ${item.value}`).join("   ·   ");
  y = writeWrapped(doc, summary, MARGIN, y + 1, CONTENT_W, { size: 8.4, color: INK, bold: true });
  y += 4;

  const tables = report.tables?.length ? report.tables : [{ title: null, ...report.table }];
  tables.forEach((table) => {
    if (table?.title) {
      y = ensureSpace(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.6);
      doc.setTextColor(...INK);
      doc.text(table.title, MARGIN, y);
      y += 5;
    }
    y = renderTable(doc, table, y);
  });

  (report.gaps || []).forEach((gap) => {
    y = ensureSpace(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`${gap.label} (${gap.records.length})`, MARGIN, y);
    y += 5;
    y = writeWrapped(
      doc,
      gap.records.map((record) => record.name).join(", "),
      MARGIN,
      y,
      CONTENT_W,
      { size: 7.8 },
    );
  });

  return y;
}

export function createPipeCollectionReportsPdf(reports = [], { title = "PipeKeeper & Cellar Reports", owner = "" } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(title, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${new Date().toLocaleDateString()}${owner ? `   ·   ${owner}` : ""}`, MARGIN, y);
  y += 10;

  reports.forEach((report, index) => {
    y = renderReport(doc, report, y, index === 0);
  });

  return doc;
}

export function pipeCollectionReportsFilename(extension = "pdf") {
  return `PipeKeeper-Reports-${new Date().toISOString().split("T")[0]}.${extension}`;
}