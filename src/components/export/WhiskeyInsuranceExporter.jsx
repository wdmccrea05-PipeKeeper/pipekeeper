import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Shield, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/useCurrency';
import { getBottleUnitValue } from '@/lib/collection/whiskeySelectors';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { formatDate } from '@/components/utils/localeFormatters';

function escapeCsvCell(cell) {
  return `"${String(cell ?? '').replace(/"/g, '""')}"`;
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function WhiskeyInsuranceExporter({ user, bottles = [], inventoryUnits = [] }) {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [loadingPdf, setLoadingPdf] = useState(false);

  const getBottleValue = (b) => getBottleUnitValue(b);

  const exportInventoryCsv = () => {
    if (!bottles.length) return;

    const headers = [
      'Name',
      'Distillery',
      'Type',
      'Region',
      'Country',
      'Age (Years)',
      'ABV (%)',
      'Bottle Size',
      'Purchase Price',
      'Purchase Date',
      'Est. Value',
      'Inventory Units',
      'Open Units',
      'Sealed Units',
      'Rating',
      'Notes',
    ];

    const rows = bottles.map((b) => {
      const units = (inventoryUnits || []).filter((u) => u.bottle_id === b.id);
      const openUnits = units.filter((u) => u.status === 'open').length;
      const sealedUnits = units.filter((u) => u.status === 'reserve' || u.status === 'drinking').length;
      const totalUnits = units.length > 0 ? units.length : (Number(b.bottle_count) || 1);
      return [
        b.name || '',
        b.distillery || '',
        b.type || '',
        b.region || '',
        b.country || '',
        b.age || '',
        b.abv || '',
        b.bottle_size || '',
        b.purchase_price || '',
        b.purchase_date || '',
        getBottleValue(b) > 0 ? getBottleValue(b).toFixed(2) : '',
        totalUnits,
        openUnits,
        sealedUnits,
        b.rating || '',
        b.notes || '',
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `whiskeykeeper-insurance-inventory-${exportDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportInsurancePdf = async () => {
    if (!bottles.length) return;
    setLoadingPdf(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const fmtMoney = (n) => (n > 0 ? formatFromBase(n) : '—');

      const totalValue = bottles.reduce((s, b) => s + getBottleValue(b), 0);

      doc.setFontSize(20);
      doc.setTextColor(40, 20, 10);
      doc.text('WhiskeyKeeper — Insurance Report', pw / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 80, 60);
      doc.text(`Generated: ${formatDate(new Date(), 'short')}`, pw / 2, 28, { align: 'center' });
      doc.text(`Owner: ${user?.full_name || user?.email || 'Collection Owner'}`, pw / 2, 34, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(60, 40, 20);
      doc.text(`Total Collection Value: ${fmtMoney(totalValue)}`, 20, 44);
      doc.text(`Total Bottle Types: ${bottles.length}`, 20, 51);

      let y = 62;
      for (const [idx, bottle] of bottles.entries()) {
        if (y > ph - 60) {
          doc.addPage();
          y = 20;
        }

        doc.setDrawColor(180, 140, 75);
        doc.setLineWidth(0.4);
        doc.line(20, y, pw - 20, y);
        y += 5;

        const photo = bottle.photo || (Array.isArray(bottle.photos) ? bottle.photos[0] : null);
        let textX = 20;
        if (photo) {
          const dataUrl = await loadImageAsBase64(photo);
          if (dataUrl) {
            const imgW = 35;
            const imgH = 50;
            if (y + imgH > ph - 20) {
              doc.addPage();
              y = 20;
            }
            doc.addImage(dataUrl, 'JPEG', 20, y, imgW, imgH);
            textX = 20 + imgW + 5;
          }
        }

        const textStartY = y;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(40, 20, 10);
        doc.text(`${idx + 1}. ${bottle.name || 'Unnamed'}`, textX, textStartY + 6);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 40, 20);
        let ty = textStartY + 12;

        const fields = [
          bottle.distillery ? `Distillery: ${bottle.distillery}` : null,
          [bottle.type, bottle.region, bottle.country].filter(Boolean).join(' | ') || null,
          [
            bottle.age ? `Age: ${bottle.age} yr` : null,
            bottle.abv ? `ABV: ${bottle.abv}%` : null,
            bottle.bottle_size || null,
          ]
            .filter(Boolean)
            .join(' | ') || null,
          `Value: ${fmtMoney(getBottleValue(bottle))}`,
          bottle.purchase_price ? `Purchase Price: ${fmtMoney(bottle.purchase_price)}` : null,
          bottle.purchase_date
            ? `Purchased: ${formatDate(new Date(bottle.purchase_date), 'short')}`
            : null,
        ].filter(Boolean);

        fields.forEach((line) => {
          if (ty > ph - 20) {
            doc.addPage();
            ty = 20;
          }
          doc.text(line, textX, ty);
          ty += 5;
        });

        if (bottle.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${bottle.notes}`, pw - textX - 20);
          if (ty + notesLines.length * 4.5 > ph - 20) {
            doc.addPage();
            ty = 20;
          }
          doc.text(notesLines, textX, ty);
          ty += notesLines.length * 4.5;
        }

        y = Math.max(ty, y + (photo ? 55 : 0)) + 6;
      }

      doc.save(`whiskey-insurance-report-${exportDateStamp()}.pdf`);
    } catch (err) {
      toast.error(t("auto.components_export_WhiskeyInsuranceExporter.insurance_export_failed_toast") + (err?.message || 'Unknown error'));
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportInventoryCsv} disabled={bottles.length === 0}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("auto.components_export_WhiskeyInsuranceExporter.inventory_csv_1eqzko")}
      </Button>
      <Button variant="outline" size="sm" onClick={exportInsurancePdf} disabled={loadingPdf || bottles.length === 0}>
        <Shield className="w-4 h-4 mr-2" />
        {loadingPdf ? 'Generating…' : 'Insurance Report'}
      </Button>
    </div>
  );
}
