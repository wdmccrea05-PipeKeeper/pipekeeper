import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Shield, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/useCurrency';
import { getWineUnitValue, getWineTotalValue } from '@/lib/collection/wineSelectors';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatDate, formatDateTime } from '@/components/utils/localeFormatters';

function escapeCsvCell(cell) {
  return `"${String(cell ?? '').replace(/"/g, '""')}"`;
}

function formatDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? formatDate(d, 'short') : '—';
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function WineInsuranceExporter({ user, wines = [] }) {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [loadingPdf, setLoadingPdf] = useState(false);

  const exportInventoryCsv = () => {
    if (!wines.length) return;

    const headers = [
      'Name',
      'Producer',
      'Vintage',
      'Varietal',
      'Style',
      'Region',
      'Country',
      'Quantity',
      'Bottle Size',
      'Purchase Price',
      'Est. Unit Value',
      'Est. Total Value',
      'Drink Window Start',
      'Drink Window End',
      'Rating',
      'Purchase Date',
      'Valuation Confidence',
      'Notes',
    ];

    const rows = wines.map((w) => [
      w.name || '',
      w.producer || '',
      w.vintage || '',
      w.varietal || '',
      w.style || '',
      w.region || '',
      w.country_of_origin || '',
      w.quantity || 1,
      w.bottle_size || '',
      w.purchase_price || '',
      getWineUnitValue(w) > 0 ? getWineUnitValue(w).toFixed(2) : '',
      getWineTotalValue(w) > 0 ? getWineTotalValue(w).toFixed(2) : '',
      w.drinking_window_start || w.drink_window_start || '',
      w.drinking_window_end || w.drink_window_end || '',
      w.rating || '',
      w.purchase_date || '',
      w.valuation_confidence || w.market_valuation_confidence || '',
      w.notes || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `winekeeper-insurance-inventory-${exportDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportInsurancePdf = async () => {
    if (!wines.length) return;

    setLoadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const totalBottles = wines.reduce((s, w) => s + (w.quantity || 1), 0);
      const totalValue = wines.reduce((s, w) => s + getWineTotalValue(w), 0);
      const totalPurchase = wines.reduce((s, w) => s + (Number(w.purchase_price) || 0) * (w.quantity || 1), 0);

      // Cover
      doc.setFontSize(20);
      doc.text('WineKeeper Insurance Report', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth / 2, 26, { align: 'center' });
      doc.text(`Owner: ${user?.full_name || user?.email || 'Collection Owner'}`, pageWidth / 2, 32, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Collection Summary', 14, 44);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Unique wines: ${wines.length}`, 14, 51);
      doc.text(`Total bottles in cellar: ${totalBottles}`, 14, 57);
      doc.text(`Total estimated value: ${formatFromBase(totalValue)}`, 14, 63);
      doc.text(`Total purchase basis: ${totalPurchase > 0 ? formatFromBase(totalPurchase) : '—'}`, 14, 69);

      let y = 82;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Cellar Documentation', 14, y);
      y += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      for (const [index, wine] of wines.entries()) {
        const qty = wine.quantity || 1;
        const unitValue = getWineUnitValue(wine);
        const totalVal = getWineTotalValue(wine);

        if (y > pageHeight - 55) {
          doc.addPage();
          y = 18;
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        const displayName = [wine.producer, wine.name, wine.vintage].filter(Boolean).join(' ') || wine.name || 'Unnamed';
        doc.text(`${index + 1}. ${displayName}`, 14, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        // Photos
        const photo = Array.isArray(wine.photos) ? wine.photos[0] : null;
        if (photo) {
          try {
            const base64 = await loadImageAsBase64(photo);
            if (y + 34 > pageHeight - 20) {
              doc.addPage();
              y = 18;
            }
            doc.addImage(base64, 'JPEG', 18, y, 30, 30);
            y += 32;
          } catch {
            doc.text('Photo unavailable for export.', 18, y);
            y += 5;
          }
        }

        const style = [wine.style, wine.varietal].filter(Boolean).join(' · ');
        if (style) { doc.text(style, 18, y); y += 5; }

        const geo = [wine.region, wine.appellation, wine.country_of_origin].filter(Boolean).join(' · ');
        if (geo) { doc.text(geo, 18, y); y += 5; }

        doc.text(`Qty: ${qty} | Unit value: ${unitValue > 0 ? formatFromBase(unitValue) : '—'} | Total: ${totalVal > 0 ? formatFromBase(totalVal) : '—'}`, 18, y);
        y += 5;

        if (wine.purchase_price) {
          doc.text(`Purchase price: ${formatFromBase(Number(wine.purchase_price))} | Date: ${formatDate(wine.purchase_date)}`, 18, y);
          y += 5;
        }

        const windowStart = wine.drinking_window_start || wine.drink_window_start;
        const windowEnd = wine.drinking_window_end || wine.drink_window_end;
        if (windowStart || windowEnd) {
          doc.text(`Drink window: ${formatDate(windowStart)} – ${formatDate(windowEnd)}`, 18, y);
          y += 5;
        }

        if (wine.notes) {
          const lines = doc.splitTextToSize(`Notes: ${wine.notes}`, pageWidth - 36);
          if (y + lines.length * 4.5 > pageHeight - 18) {
            doc.addPage();
            y = 18;
          }
          doc.text(lines, 18, y);
          y += lines.length * 4.5;
        }

        y += 4;
      }

      doc.save(`winekeeper-insurance-report-${exportDateStamp()}.pdf`);
    } catch (error) {
      toast.error(`Insurance export failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportInventoryCsv} disabled={wines.length === 0}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("auto.components_export_WineInsuranceExporter.inventory_csv_1eqzko")}
      </Button>
      <Button variant="outline" size="sm" onClick={exportInsurancePdf} disabled={loadingPdf || wines.length === 0}>
        <Shield className="w-4 h-4 mr-2" />
        {loadingPdf ? 'Generating…' : 'Insurance Report'}
      </Button>
    </div>
  );
}
