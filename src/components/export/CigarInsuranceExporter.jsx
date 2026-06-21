import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Shield, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/useCurrency';
import {
  getCigarDisplayName,
  getCigarQuantity,
  getCigarRemainingValue,
  getCigarUnitValue,
} from '@/components/cigars/cigarReports';
import { useTranslation } from '@/components/i18n/safeTranslation';

function escapeCsvCell(cell) {
  return `"${String(cell ?? '').replace(/"/g, '""')}"`;
}

function formatDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : '—';
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

export default function CigarInsuranceExporter({ user, cigars = [], humidors = [] }) {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [loadingPdf, setLoadingPdf] = useState(false);

  const humidorById = React.useMemo(
    () => (humidors || []).reduce((acc, humidor) => {
      if (humidor?.id) acc[humidor.id] = humidor;
      return acc;
    }, {}),
    [humidors]
  );

  const exportInventoryCsv = () => {
    if (!cigars.length) return;

    const headers = [
      'Brand',
      'Name',
      'Quantity',
      'Humidor',
      'Estimated Unit Value',
      'Purchase Price',
      'Estimated Remaining Value',
      'Purchase Date',
      'Last Updated',
      'Photo Count',
    ];

    const rows = cigars.map((cigar) => {
      const humidor = humidorById[cigar.humidor_id]?.name || 'Unassigned';
      const quantity = getCigarQuantity(cigar);
      return [
        cigar.brand || '',
        cigar.name || '',
        quantity,
        humidor,
        getCigarUnitValue(cigar) || '',
        cigar.purchase_price || '',
        getCigarRemainingValue(cigar),
        cigar.purchase_date || '',
        cigar.updated_date || cigar.created_date || '',
        Array.isArray(cigar.photos) ? cigar.photos.length : 0,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cigarkeeper-insurance-inventory-${exportDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportInsurancePdf = async () => {
    if (!cigars.length) return;

    setLoadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const generatedAt = new Date();
      const totalCigars = cigars.reduce((sum, cigar) => sum + getCigarQuantity(cigar), 0);
      const totalValue = cigars.reduce((sum, cigar) => sum + getCigarRemainingValue(cigar), 0);
      const totalPurchase = cigars.reduce((sum, cigar) => sum + ((Number(cigar.purchase_price) || 0) * getCigarQuantity(cigar)), 0);

      doc.setFontSize(20);
      doc.text('CigarKeeper Insurance Report', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated: ${generatedAt.toLocaleString()}`, pageWidth / 2, 26, { align: 'center' });
      doc.text(`Owner: ${user?.full_name || user?.email || 'Collection Owner'}`, pageWidth / 2, 32, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Collection Summary', 14, 44);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Total unique cigars: ${cigars.length}`, 14, 50);
      doc.text(`Total cigars in collection: ${totalCigars}`, 14, 56);
      doc.text(`Total estimated value: ${formatFromBase(totalValue)}`, 14, 62);
      doc.text(`Total purchase basis: ${formatFromBase(totalPurchase)}`, 14, 68);

      let y = 78;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Inventory Documentation', 14, y);
      y += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      for (const [index, cigar] of cigars.entries()) {
        const humidor = humidorById[cigar.humidor_id]?.name || 'Unassigned';
        const quantity = getCigarQuantity(cigar);
        const unitValue = getCigarUnitValue(cigar);
        const remainingValue = getCigarRemainingValue(cigar);

        if (y > pageHeight - 50) {
          doc.addPage();
          y = 18;
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${getCigarDisplayName(cigar)}`, 14, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`Humidor: ${humidor} | Qty: ${quantity} | Unit value: ${unitValue > 0 ? formatFromBase(unitValue) : '—'}`, 18, y);
        y += 5;
        doc.text(`Remaining value: ${formatFromBase(remainingValue)} | Purchase: ${Number(cigar.purchase_price) > 0 ? formatFromBase(Number(cigar.purchase_price)) : '—'}`, 18, y);
        y += 5;
        doc.text(`Purchase date: ${formatDate(cigar.purchase_date)} | Updated: ${formatDate(cigar.updated_date || cigar.created_date)}`, 18, y);
        y += 5;

        if (Array.isArray(cigar.photos) && cigar.photos.length > 0) {
          const firstPhoto = cigar.photos[0];
          try {
            const base64 = await loadImageAsBase64(firstPhoto);
            if (y + 34 > pageHeight - 18) {
              doc.addPage();
              y = 18;
            }
            doc.addImage(base64, 'JPEG', 18, y, 30, 30);
            y += 32;
          } catch {
            doc.text('Photo unavailable for export (source blocked or invalid).', 18, y);
            y += 5;
          }
        }

        if (cigar.personal_notes) {
          const lines = doc.splitTextToSize(`Notes: ${cigar.personal_notes}`, pageWidth - 36);
          if (y + (lines.length * 4) > pageHeight - 18) {
            doc.addPage();
            y = 18;
          }
          doc.text(lines, 18, y);
          y += lines.length * 4;
        }

        y += 4;
      }

      doc.save(`cigarkeeper-insurance-report-${exportDateStamp()}.pdf`);
    } catch (error) {
      toast.error(`Insurance export failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={exportInventoryCsv} disabled={cigars.length === 0}>
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("auto.components_export_CigarInsuranceExporter.inventory_csv_1eqzko")}
      </Button>
      <Button variant="outline" size="sm" onClick={exportInsurancePdf} disabled={loadingPdf || cigars.length === 0}>
        <Shield className="w-4 h-4 mr-2" />
        {loadingPdf ? 'Generating…' : 'Insurance Report'}
      </Button>
    </div>
  );
}
