/**
 * Printable PDF for the collection report.
 *
 * Renders on white paper with dark ink so the output prints cleanly:
 *   cover + summary → pipe pairing chart → top matches (with score bars)
 *   → complementary suggestions.
 */
import jsPDF from "jspdf";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 18;

const INK = [31, 27, 22];
const MUTED = [111, 103, 92];
const FAINT = [140, 133, 124];
const GOLD = [180, 140, 75];
const RULE = [222, 214, 202];
const TRACK = [232, 226, 216];

const MODULE_LABELS = [
  ["pipe", "Pipes"],
  ["whiskey", "Whiskey"],
  ["cigar", "Cigars"],
  ["wine", "Wines"],
];

function ensureSpace(doc, y, needed) {
  if (y + needed > BOTTOM) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function writeWrapped(doc, text, x, y, width, { size = 7.6, color = MUTED, lineHeight = 3.1, bold = false } = {}) {
  if (!text) return y;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(String(text), width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function sectionTitle(doc, title, subtitle, startY) {
  let y = ensureSpace(doc, startY, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(title, MARGIN, y);

  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 2.4, MARGIN + 24, y + 2.4);

  y += 7;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(subtitle, MARGIN, y);
    y += 5;
  }
  return y + 2;
}

function formatReportDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

async function toPhoto(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    if (dataUrl.startsWith("data:image/png")) return { dataUrl, format: "PNG" };
    if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
      return { dataUrl, format: "JPEG" };
    }
    return null;
  } catch {
    return null;
  }
}

function collectPhotoUrls(report) {
  if (!report?.includePhotos) return [];
  const urls = new Set();
  (report.pairingChart || []).forEach((row) => {
    if (row.photo) urls.add(row.photo);
  });
  (report.topMatches || []).forEach((group) => {
    (group.entries || []).forEach((entry) => {
      if (entry.photo) urls.add(entry.photo);
    });
  });
  return [...urls];
}

async function loadPhotos(report) {
  const urls = collectPhotoUrls(report);
  const map = new Map();
  await Promise.all(
    urls.map(async (url) => {
      const photo = await toPhoto(url);
      if (photo) map.set(url, photo);
    }),
  );
  return map;
}

function addImage(doc, photo, x, y, size) {
  if (!photo) return;
  try {
    doc.addImage(photo.dataUrl, photo.format, x, y, size, size);
  } catch {
    // A single unreadable photo must never break the report.
  }
}

function drawCover(doc, report) {
  doc.setFillColor(20, 15, 12);
  doc.rect(0, 0, PAGE_W, 44, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(245, 241, 231);
  doc.text("Collection Report", MARGIN, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(224, 216, 200);
  doc.text("Pairing insights, top matches and complementary suggestions", MARGIN, 29.5);

  const modules = MODULE_LABELS.filter(([key]) => report?.modules?.[key]).map(([, label]) => label);
  doc.setFontSize(8);
  doc.setTextColor(212, 165, 116);
  doc.text(
    [formatReportDate(report?.generatedAt), modules.join(" · ")].filter(Boolean).join("   ·   "),
    MARGIN,
    36.5,
  );

  // Summary strip
  const boxes = [
    ["Pipes", report?.summary?.pipes ?? 0],
    ["Blends", report?.summary?.blends ?? 0],
    ["Bottles", report?.summary?.bottles ?? 0],
    ["Wines", report?.summary?.wines ?? 0],
    ["Cigars", report?.summary?.cigars ?? 0],
    ["Sessions", report?.summary?.sessions ?? 0],
  ];
  const gap = 3;
  const boxW = (CONTENT_W - gap * (boxes.length - 1)) / boxes.length;
  const boxY = 52;

  boxes.forEach(([label, value], index) => {
    const x = MARGIN + index * (boxW + gap);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, boxY, boxW, 16, 2, 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(label).toUpperCase(), x + 3, boxY + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(value), x + 3, boxY + 12.5);
  });

  return boxY + 24;
}

function drawPipeBlock(doc, row, photos, report, startY) {
  let y = ensureSpace(doc, startY, 24);
  const photo = photos.get(row.photo);
  const textX = photo ? MARGIN + 24 : MARGIN;
  const wrapW = CONTENT_W - (photo ? 24 : 0);

  addImage(doc, photo, MARGIN, y - 4, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.4);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(row.name, textX, y);
  y += 4.4;

  const meta = [row.maker, row.shape, row.material].filter(Boolean).join(" · ");
  if (meta) {
    y = writeWrapped(doc, meta, textX, y, wrapW, { size: 7.8, color: MUTED, lineHeight: 3.1 }) + 0.4;
  }

  const specParts = [`Specialization: ${row.specialization}`];
  if (row.chamber) specParts.push(row.chamber);
  if (row.sessions) specParts.push(`${row.sessions} session${row.sessions === 1 ? "" : "s"} logged`);
  y = writeWrapped(doc, specParts.join("  ·  "), textX, y, wrapW, { size: 7.6, color: GOLD, lineHeight: 3 }) + 1.4;

  if (!row.matches?.length) {
    y = writeWrapped(doc, "No blends in your collection yet.", textX, y, wrapW, {
      size: 7.8,
      color: MUTED,
      lineHeight: 3.2,
    }) + 1;
  } else {
    row.matches.forEach((match, index) => {
      const withExplanation = report.includeExplanations && match.why;
      y = ensureSpace(doc, y, withExplanation ? 14 : 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.8);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(`${index + 1}. ${match.blendName}`, textX, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.text(`${Number(match.score || 0).toFixed(1)}/10`, MARGIN + CONTENT_W, y, { align: "right" });
      y += 3.5;

      const sub = [match.manufacturer, match.blendType].filter(Boolean).join(" · ");
      if (sub) {
        y = writeWrapped(doc, sub, textX + 2, y, wrapW - 4, { size: 7.2, color: MUTED, lineHeight: 3 });
      }
      if (withExplanation) {
        y = writeWrapped(doc, match.why, textX + 2, y, wrapW - 4, {
          size: 7.2,
          color: MUTED,
          lineHeight: 3,
        }) + 0.6;
      }
    });
  }

  doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 1.6, MARGIN + CONTENT_W, y + 1.6);
  return y + 6;
}

function drawPairingSection(doc, report, photos, startY) {
  if (!report?.modules?.pipe || !report.pairingChart?.length) return startY;
  let y = sectionTitle(
    doc,
    "Pipe Pairing Chart",
    `Each pipe with its specialization and top ${report.blendsPerPipe} blend matches from your collection.`,
    startY,
  );
  for (const row of report.pairingChart) {
    y = drawPipeBlock(doc, row, photos, report, y);
  }
  return y + 4;
}

function drawTopMatchesSection(doc, report, photos, startY) {
  if (!report?.topMatches?.length) return startY;
  let y = sectionTitle(doc, "Top Matches", "The strongest options in each module, ranked from your own collection.", startY);

  for (const group of report.topMatches) {
    if (!group.entries?.length) continue;
    y = ensureSpace(doc, y, 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.4);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(group.label, MARGIN, y);
    y += 4;

    if (group.description) {
      y = writeWrapped(doc, group.description, MARGIN, y, CONTENT_W, {
        size: 7.6,
        color: MUTED,
        lineHeight: 3.1,
      }) + 1.4;
    }

    group.entries.forEach((entry, index) => {
      y = ensureSpace(doc, y, report.includeExplanations && entry.explanation ? 15 : 9);
      const photo = photos.get(entry.photo);
      const textX = photo ? MARGIN + 13 : MARGIN;
      const wrapW = CONTENT_W - (photo ? 13 : 0);
      addImage(doc, photo, MARGIN, y - 3.2, 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.7);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(`${index + 1}. ${entry.name}`, textX, y);

      doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.text(Number(entry.score || 0).toFixed(1), MARGIN + CONTENT_W, y, { align: "right" });
      y += 3.2;

      const barW = wrapW - 12;
      doc.setFillColor(TRACK[0], TRACK[1], TRACK[2]);
      doc.rect(textX, y, barW, 1.4, "F");
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.rect(textX, y, Math.max(1, barW * Math.min(1, Number(entry.score || 0) / 10)), 1.4, "F");
      y += 3.2;

      if (entry.detail) {
        y = writeWrapped(doc, entry.detail, textX, y, wrapW, { size: 7.2, color: MUTED, lineHeight: 3 });
      }
      if (report.includeExplanations && entry.explanation) {
        y = writeWrapped(doc, entry.explanation, textX, y, wrapW, { size: 7.2, color: FAINT, lineHeight: 3 });
      }
      y += 1.8;
    });

    y += 3;
  }

  return y + 2;
}

function drawComplementarySection(doc, report, startY) {
  if (!report?.complementary?.length) return startY;
  let y = sectionTitle(doc, "Complementary Report", "New ways to use what you already own.", startY);

  for (const group of report.complementary) {
    if (!group.entries?.length) continue;
    y = ensureSpace(doc, y, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(group.title, MARGIN, y);
    y += 4;

    if (group.description) {
      y = writeWrapped(doc, group.description, MARGIN, y, CONTENT_W, {
        size: 7.5,
        color: MUTED,
        lineHeight: 3.1,
      }) + 1.2;
    }

    group.entries.forEach((entry) => {
      y = ensureSpace(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.6);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      y = writeWrapped(doc, entry.title, MARGIN, y, CONTENT_W, {
        size: 8.6,
        color: INK,
        lineHeight: 3.4,
        bold: true,
      });
      if (entry.meta) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text(String(entry.meta).toUpperCase(), MARGIN, y);
        y += 3;
      }
      y = writeWrapped(doc, entry.detail, MARGIN, y, CONTENT_W, {
        size: 7.4,
        color: MUTED,
        lineHeight: 3.1,
      }) + 2.4;
    });

    y += 3;
  }

  return y;
}

function addFooters(doc) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    doc.text("CollectionKeeper · Collection Report", MARGIN, PAGE_H - 8);
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }
}

export async function createCollectionReportPdf(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const photos = report?.includePhotos ? await loadPhotos(report) : new Map();

  let y = drawCover(doc, report);
  y = drawPairingSection(doc, report, photos, y);
  y = drawTopMatchesSection(doc, report, photos, y);
  drawComplementarySection(doc, report, y);

  addFooters(doc);
  return doc;
}