/**
 * src/lib/valuation/valuationReportPdf.js
 *
 * Printable A4 rendering for any valuation report model.
 *
 * White paper, dark ink, one table per report, a totals block, the source
 * attribution and the uncertainty disclosures on every page footer, and a page
 * number so a printed schedule can be reassembled.
 */
import jsPDF from 'jspdf';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 22;

const INK = [28, 24, 20];
const MUTED = [110, 102, 92];
const RULE = [222, 214, 202];
const GOLD = [150, 112, 52];

function money(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cellValue(row, column) {
  const raw = row?.[column.key];
  if (raw === null || raw === undefined || raw === '') return '—';
  if (column.format === 'currency') return money(raw);
  if (column.format === 'amount') return Number(raw).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (column.format === 'percent') return `${Math.round(Number(raw))}%`;
  return String(raw);
}

function totalValue(total) {
  if (total?.format === 'currency') return money(total.value);
  return String(total?.value ?? '—');
}

function pageFooter(doc, page, totalPages, model) {
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  const note = (model.disclosures || [])[0] || '';
  doc.text(doc.splitTextToSize(note, CONTENT_W - 24), MARGIN, PAGE_H - 13);
  doc.text(`Page ${page} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
  doc.text(model.owner || '', MARGIN, PAGE_H - 6);
}

function header(doc, model) {
  let y = MARGIN;
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(model.title, MARGIN, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  if (model.purpose) doc.text(doc.splitTextToSize(model.purpose, CONTENT_W), MARGIN, y + 12);

  const generated = model.generatedAt ? new Date(model.generatedAt).toISOString().slice(0, 10) : '';
  doc.setFontSize(7.4);
  doc.text(`Generated ${generated}`, PAGE_W - MARGIN, y + 6, { align: 'right' });
  doc.text(model.owner || '', PAGE_W - MARGIN, y + 10, { align: 'right' });

  y += 18;
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const attribution = doc.splitTextToSize(model.attribution || '', CONTENT_W);
  doc.text(attribution, MARGIN, y);
  y += attribution.length * 3 + 3;

  if (model.note) {
    const note = doc.splitTextToSize(model.note, CONTENT_W);
    doc.text(note, MARGIN, y);
    y += note.length * 3 + 2;
  }

  return y;
}

function drawTableHeader(doc, columns, y) {
  const totalWidth = columns.reduce((sum, column) => sum + (column.width || 1), 0);
  let x = MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  columns.forEach((column) => {
    const width = (column.width / totalWidth) * CONTENT_W;
    doc.text(column.label.toUpperCase(), x, y, { maxWidth: width - 1 });
    x += width;
  });
  doc.setDrawColor(...RULE);
  doc.line(MARGIN, y + 1.6, PAGE_W - MARGIN, y + 1.6);
  return y + 4.6;
}

function drawRow(doc, columns, row, y) {
  const totalWidth = columns.reduce((sum, column) => sum + (column.width || 1), 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...INK);

  let x = MARGIN;
  let lines = 1;
  columns.forEach((column) => {
    const width = (column.width / totalWidth) * CONTENT_W;
    const text = doc.splitTextToSize(cellValue(row, column), width - 1.6);
    lines = Math.max(lines, text.length);
    const align = column.align === 'right' ? 'right' : 'left';
    doc.text(text, align === 'right' ? x + width - 1 : x, y, { align });
    x += width;
  });

  return y + lines * 3 + 1.6;
}

/** Render a report model to a jsPDF document. */
export function buildValuationReportPdf(model = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const columns = model.columns || [];
  let y = header(doc, model);
  let page = 1;

  if (!model.rows || model.rows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(model.emptyMessage || 'No records.', MARGIN, y + 4);
  } else {
    y = drawTableHeader(doc, columns, y);
    model.rows.forEach((row) => {
      const needed = 8;
      if (y + needed > BOTTOM) {
        doc.addPage();
        page += 1;
        y = header(doc, model);
        y = drawTableHeader(doc, columns, y);
      }
      y = drawRow(doc, columns, row, y);
      doc.setDrawColor(240, 236, 230);
      doc.line(MARGIN, y - 1.2, PAGE_W - MARGIN, y - 1.2);
    });
  }

  if (model.totals && model.totals.length) {
    if (y + model.totals.length * 5 + 10 > BOTTOM) {
      doc.addPage();
      page += 1;
      y = header(doc, model);
    }
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text('SUMMARY', MARGIN, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    model.totals.forEach((total) => {
      doc.setTextColor(...MUTED);
      doc.text(total.label, MARGIN, y);
      doc.setTextColor(...INK);
      doc.text(totalValue(total), PAGE_W - MARGIN, y, { align: 'right' });
      y += 4.6;
    });
  }

  if (model.disclosures && model.disclosures.length > 1) {
    if (y + model.disclosures.length * 5 + 6 > BOTTOM) {
      doc.addPage();
      page += 1;
      y = header(doc, model);
    }
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text('DISCLOSURES', MARGIN, y);
    y += 3.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    model.disclosures.slice(1).forEach((disclosure) => {
      const lines = doc.splitTextToSize(disclosure, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 2.9 + 1.4;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let index = 1; index <= totalPages; index += 1) {
    doc.setPage(index);
    pageFooter(doc, index, totalPages, model);
  }

  return doc;
}

export function downloadValuationReport(model) {
  const doc = buildValuationReportPdf(model);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${model.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.pdf`);
}

export function openValuationReportPreview(model) {
  const doc = buildValuationReportPdf(model);
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}