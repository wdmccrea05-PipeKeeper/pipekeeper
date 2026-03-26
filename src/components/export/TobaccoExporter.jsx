import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import { useTranslation } from "@/components/i18n/safeTranslation";
import { calculateCellaredOzFromLogs } from "@/components/utils/tobaccoQuantityHelpers";

// ─── PDF HELPERS ────────────────────────────────────────────────────────────

function createPDFHelpers(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const contentWidth = pageWidth - marginLeft - 20;
  const bottomMargin = 20;

  function ensurePageSpace(y, requiredHeight) {
    if (y + requiredHeight > pageHeight - bottomMargin) {
      doc.addPage();
      return 22;
    }
    return y;
  }

  function writeLine(text, x, y, opts = {}) {
    doc.text(String(text ?? ''), x, y, opts);
    return y;
  }

  function writeWrappedText(text, x, y, maxWidth, lineHeight = 4.5) {
    const lines = doc.splitTextToSize(String(text ?? ''), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function writeSectionHeader(text, x, y) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text(String(text), x, y);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    return y + 6;
  }

  function writeLabelValue(label, value, x, y) {
    if (value == null || value === '' || value === 0) return y;
    const line = `${label}: ${value}`;
    const lines = doc.splitTextToSize(line, contentWidth - (x - marginLeft));
    doc.text(lines, x, y);
    return y + lines.length * 4.5;
  }

  return { pageWidth, contentWidth, marginLeft, ensurePageSpace, writeLine, writeWrappedText, writeSectionHeader, writeLabelValue };
}

// ─── SAFE NUMBER ─────────────────────────────────────────────────────────────

function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function fmt(n, dec = 1) {
  return safeNum(n).toFixed(dec);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, safeNum(val)));
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function TobaccoExporter() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['tobacco-blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs-all', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  // ─── CSV ──────────────────────────────────────────────────────────────────

  const exportToCSV = () => {
    const headers = [
      'Name', 'Manufacturer', 'Blend Type', 'Cut', 'Strength', 'Room Note',
      'Tobacco Components', 'Flavor Notes', 'Production Status', 'Aging Potential',
      'Rating', 'Favorite',
      'Total Tins', 'Tin Size (oz)', 'Tins Open', 'Tins Cellared', 'Tin Cellared Date', 'Tin Total Weight (oz)',
      'Bulk Total (oz)', 'Bulk Open (oz)', 'Bulk Cellared (oz)', 'Bulk Cellared Date',
      'Total Pouches', 'Pouch Size (oz)', 'Pouches Open', 'Pouches Cellared', 'Pouch Cellared Date', 'Pouch Total Weight (oz)',
      'Overall Total (oz)', 'Overall Open (oz)', 'Overall Cellared (oz)',
      'Notes',
    ];

    const rows = blends.map(b => {
      const tinOpenOz = safeNum(b.tin_tins_open) * safeNum(b.tin_size_oz);
      const pouchOpenOz = safeNum(b.pouch_pouches_open) * safeNum(b.pouch_size_oz);
      const totalCellared = calculateCellaredOzFromLogs(cellarLogs, b.id);
      const totalWeight = safeNum(b.tin_total_quantity_oz) + safeNum(b.bulk_total_quantity_oz) + safeNum(b.pouch_total_quantity_oz);
      const totalOpen = tinOpenOz + safeNum(b.bulk_open) + pouchOpenOz;

      return [
        b.name || '',
        b.manufacturer || '',
        b.blend_type || '',
        b.cut || '',
        b.strength || '',
        b.room_note || '',
        Array.isArray(b.tobacco_components) ? b.tobacco_components.join('; ') : '',
        Array.isArray(b.flavor_notes) ? b.flavor_notes.join('; ') : '',
        b.production_status || '',
        b.aging_potential || '',
        b.rating || '',
        b.is_favorite ? 'Yes' : 'No',
        safeNum(b.tin_total_tins),
        safeNum(b.tin_size_oz),
        safeNum(b.tin_tins_open),
        safeNum(b.tin_tins_cellared),
        b.tin_cellared_date || '',
        safeNum(b.tin_total_quantity_oz),
        safeNum(b.bulk_total_quantity_oz),
        safeNum(b.bulk_open),
        safeNum(b.bulk_cellared),
        b.bulk_cellared_date || '',
        safeNum(b.pouch_total_pouches),
        safeNum(b.pouch_size_oz),
        safeNum(b.pouch_pouches_open),
        safeNum(b.pouch_pouches_cellared),
        b.pouch_cellared_date || '',
        safeNum(b.pouch_total_quantity_oz),
        totalWeight.toFixed(2),
        totalOpen.toFixed(2),
        totalCellared.toFixed(2),
        b.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tobacco-collection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ─── PDF ──────────────────────────────────────────────────────────────────

  const exportToPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const h = createPDFHelpers(doc);
      const { pageWidth, contentWidth, marginLeft, ensurePageSpace, writeLine, writeWrappedText, writeSectionHeader, writeLabelValue } = h;

      const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

      // Sort blends: manufacturer then name
      const sorted = [...blends].sort((a, b) => {
        const mA = (a.manufacturer || '').toLowerCase();
        const mB = (b.manufacturer || '').toLowerCase();
        if (mA < mB) return -1;
        if (mA > mB) return 1;
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      });

      // ── Title block ──────────────────────────────────────────────────────
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      writeLine('Tobacco Collection Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      writeLine(`Generated: ${dateStr}`, pageWidth / 2, 27, { align: 'center' });

      // ── Summary block ────────────────────────────────────────────────────
      const totalBlends = blends.length;
      const uniqueBrands = [...new Set(blends.map(b => b.manufacturer).filter(Boolean))].length;
      const favoriteBlends = blends.filter(b => b.is_favorite).length;

      const totalTins = blends.reduce((s, b) => s + safeNum(b.tin_total_tins), 0);
      const tinWeightOz = blends.reduce((s, b) => s + safeNum(b.tin_total_quantity_oz), 0);
      const tinOpenOz = blends.reduce((s, b) => s + safeNum(b.tin_tins_open) * safeNum(b.tin_size_oz), 0);
      const tinCellaredOz = blends.reduce((s, b) => s + safeNum(b.tin_tins_cellared) * safeNum(b.tin_size_oz), 0);

      const bulkWeightOz = blends.reduce((s, b) => s + safeNum(b.bulk_total_quantity_oz), 0);
      const bulkOpenOz = blends.reduce((s, b) => s + safeNum(b.bulk_open), 0);
      const bulkCellaredOz = blends.reduce((s, b) => s + safeNum(b.bulk_cellared), 0);

      const totalPouches = blends.reduce((s, b) => s + safeNum(b.pouch_total_pouches), 0);
      const pouchWeightOz = blends.reduce((s, b) => s + safeNum(b.pouch_total_quantity_oz), 0);
      const pouchOpenOz = blends.reduce((s, b) => s + safeNum(b.pouch_pouches_open) * safeNum(b.pouch_size_oz), 0);
      const pouchCellaredOz = blends.reduce((s, b) => s + safeNum(b.pouch_pouches_cellared) * safeNum(b.pouch_size_oz), 0);

      const totalWeight = tinWeightOz + bulkWeightOz + pouchWeightOz;
      const totalOpenOz = tinOpenOz + bulkOpenOz + pouchOpenOz;
      const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);

      let y = 35;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      // Draw summary box
      doc.setDrawColor(200, 180, 140);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, y, contentWidth, 22, 2, 2, 'S');
      y += 5;
      doc.text(`Total Blends: ${totalBlends}`, marginLeft + 5, y);
      doc.text(`Unique Brands: ${uniqueBrands}`, marginLeft + 65, y);
      doc.text(`Favorites: ${favoriteBlends}`, marginLeft + 130, y);
      y += 6;
      doc.text(`Total Inventory: ${fmt(totalWeight)} oz`, marginLeft + 5, y);
      doc.text(`Total Open: ${fmt(totalOpenOz)} oz`, marginLeft + 65, y);
      doc.text(`Total Cellared: ${fmt(totalCellaredOz)} oz`, marginLeft + 130, y);
      y += 15;

      // ── Inventory summary ────────────────────────────────────────────────
      y = ensurePageSpace(y, 50);

      y = writeSectionHeader('Inventory Summary', marginLeft, y);

      doc.setFontSize(9);

      if (tinWeightOz > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Tin Inventory', marginLeft + 3, y);
        doc.setFont(undefined, 'normal');
        y += 4.5;
        doc.text(`  Total: ${totalTins} tins  (${fmt(tinWeightOz)} oz)    Open: ${fmt(tinOpenOz)} oz    Cellared: ${fmt(tinCellaredOz)} oz`, marginLeft + 3, y);
        y += 6;
      }

      if (bulkWeightOz > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Bulk Inventory', marginLeft + 3, y);
        doc.setFont(undefined, 'normal');
        y += 4.5;
        doc.text(`  Total: ${fmt(bulkWeightOz)} oz    Open: ${fmt(bulkOpenOz)} oz    Cellared: ${fmt(bulkCellaredOz)} oz`, marginLeft + 3, y);
        y += 6;
      }

      if (pouchWeightOz > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Pouch Inventory', marginLeft + 3, y);
        doc.setFont(undefined, 'normal');
        y += 4.5;
        doc.text(`  Total: ${totalPouches} pouches  (${fmt(pouchWeightOz)} oz)    Open: ${fmt(pouchOpenOz)} oz    Cellared: ${fmt(pouchCellaredOz)} oz`, marginLeft + 3, y);
        y += 6;
      }

      y += 6;

      // ── Blend details ────────────────────────────────────────────────────
      y = ensurePageSpace(y, 20);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Blend Details', marginLeft, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      y += 10;

      sorted.forEach((blend, idx) => {
        // Estimate block height (conservative: 10 lines * 5pt)
        y = ensurePageSpace(y, 55);

        // Blend name
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const nameLines = doc.splitTextToSize(`${idx + 1}. ${blend.name || 'Untitled'}`, contentWidth);
        doc.text(nameLines, marginLeft, y);
        y += nameLines.length * 5;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        // Manufacturer
        y = ensurePageSpace(y, 6);
        if (blend.manufacturer) {
          y = writeLabelValue('Manufacturer', blend.manufacturer, marginLeft + 4, y);
          y += 1;
        }

        // Type / Cut / Strength — build only from available values
        y = ensurePageSpace(y, 6);
        const typeParts = [];
        if (blend.blend_type) typeParts.push(`Type: ${blend.blend_type}`);
        if (blend.cut) typeParts.push(`Cut: ${blend.cut}`);
        if (blend.strength) typeParts.push(`Strength: ${blend.strength}`);
        if (typeParts.length > 0) {
          const typeText = typeParts.join('  •  ');
          const typeLines = doc.splitTextToSize(typeText, contentWidth - 4);
          doc.text(typeLines, marginLeft + 4, y);
          y += typeLines.length * 4.5 + 1;
        }

        // Inventory
        const totalTinsBlend = safeNum(blend.tin_total_tins);
        const tinWeight = safeNum(blend.tin_total_quantity_oz);
        const tinOpen = clamp(blend.tin_tins_open, 0, totalTinsBlend);
        const tinCellared = clamp(blend.tin_tins_cellared, 0, totalTinsBlend);

        const totalPouchesBlend = safeNum(blend.pouch_total_pouches);
        const pouchWeight = safeNum(blend.pouch_total_quantity_oz);
        const pouchOpen = clamp(blend.pouch_pouches_open, 0, totalPouchesBlend);
        const pouchCellared = clamp(blend.pouch_pouches_cellared, 0, totalPouchesBlend);

        const bulkWeight = safeNum(blend.bulk_total_quantity_oz);
        const bulkOpen = safeNum(blend.bulk_open);
        const bulkCellared = safeNum(blend.bulk_cellared);

        const totalBlendWeight = tinWeight + bulkWeight + pouchWeight;

        if (tinWeight > 0) {
          y = ensurePageSpace(y, 6);
          const tinLine = `Tins: ${totalTinsBlend} (${fmt(tinWeight, 2)} oz)  —  Open: ${tinOpen}  Cellared: ${tinCellared}`;
          doc.text(tinLine, marginLeft + 4, y);
          y += 5;
        }

        if (bulkWeight > 0) {
          y = ensurePageSpace(y, 6);
          const bulkLine = `Bulk: ${fmt(bulkWeight, 2)} oz  —  Open: ${fmt(bulkOpen, 2)} oz  Cellared: ${fmt(bulkCellared, 2)} oz`;
          doc.text(bulkLine, marginLeft + 4, y);
          y += 5;
        }

        if (pouchWeight > 0) {
          y = ensurePageSpace(y, 6);
          const pouchLine = `Pouches: ${totalPouchesBlend} (${fmt(pouchWeight, 2)} oz)  —  Open: ${pouchOpen}  Cellared: ${pouchCellared}`;
          doc.text(pouchLine, marginLeft + 4, y);
          y += 5;
        }

        if (totalBlendWeight > 0) {
          y = ensurePageSpace(y, 6);
          doc.setFont(undefined, 'bold');
          doc.text(`Total: ${fmt(totalBlendWeight, 2)} oz`, marginLeft + 4, y);
          doc.setFont(undefined, 'normal');
          y += 5;
        }

        // Rating — plain text only
        if (blend.rating) {
          y = ensurePageSpace(y, 6);
          const ratingNum = parseFloat(blend.rating);
          if (!isNaN(ratingNum)) {
            doc.text(`Rating: ${ratingNum.toFixed(1)} / 5`, marginLeft + 4, y);
            y += 5;
          }
        }

        // Notes
        if (blend.notes && blend.notes.trim()) {
          y = ensurePageSpace(y, 10);
          const notesText = `Notes: ${blend.notes.trim()}`;
          const notesLines = doc.splitTextToSize(notesText, contentWidth - 4);
          y = ensurePageSpace(y, notesLines.length * 4.5 + 2);
          doc.text(notesLines, marginLeft + 4, y);
          y += notesLines.length * 4.5;
        }

        // Divider
        y += 3;
        doc.setDrawColor(220, 200, 160);
        doc.setLineWidth(0.15);
        doc.line(marginLeft, y, marginLeft + contentWidth, y);
        y += 5;
      });

      doc.save(`tobacco-collection-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
        disabled={loading || blends.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("tobaccoPage.exportCSV")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        disabled={loading || blends.length === 0}
      >
        <FileText className="w-4 h-4 mr-2" />
        {t("tobaccoPage.exportPDF")}
      </Button>
    </div>
  );
}