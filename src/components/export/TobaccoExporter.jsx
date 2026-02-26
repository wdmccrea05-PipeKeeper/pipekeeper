import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import { useTranslation } from "@/components/i18n/safeTranslation";
import { calculateCellaredOzFromLogs } from "@/components/utils/tobaccoQuantityHelpers";

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

  const exportToCSV = () => {
    const headers = [
      t('export.csvName'), t('export.csvManufacturer'), t('export.csvBlendType'), t('export.csvCut'),
      t('export.csvStrength'), t('export.csvRoomNote'), t('export.csvTobaccoComponents'),
      t('export.csvFlavorNotes'), t('export.csvProductionStatus'), t('export.csvAgingPotential'),
      t('export.csvRating'), t('export.csvIsFavorite'),
      t('export.csvTotalTins'), t('export.csvTinSize'), t('export.csvTinsOpen'), t('export.csvTinsCellared'),
      t('export.csvTinCellaredDate'), t('export.csvTinTotalWeight'),
      t('export.csvTotalBulk'), t('export.csvBulkOpen'), t('export.csvBulkCellared'), t('export.csvBulkCellaredDate'),
      t('export.csvTotalPouches'), t('export.csvPouchSize'), t('export.csvPouchesOpen'),
      t('export.csvPouchesCellared'), t('export.csvPouchCellaredDate'), t('export.csvPouchTotalWeight'),
      t('export.csvOverallTotal'), t('export.csvOverallOpen'), t('export.csvOverallCellared'),
      t('export.csvNotes'),
    ];

    const rows = blends.map(b => {
      const tinOpenOz = (b.tin_tins_open || 0) * (b.tin_size_oz || 0);
      const pouchOpenOz = (b.pouch_pouches_open || 0) * (b.pouch_size_oz || 0);
      const totalCellared = calculateCellaredOzFromLogs(cellarLogs, b.id);
      const totalWeight = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);
      const totalOpen = tinOpenOz + (b.bulk_open || 0) + pouchOpenOz;

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
        b.tin_total_tins || 0,
        b.tin_size_oz || 0,
        b.tin_tins_open || 0,
        b.tin_tins_cellared || 0,
        b.tin_cellared_date || '',
        b.tin_total_quantity_oz || 0,
        b.bulk_total_quantity_oz || 0,
        b.bulk_open || 0,
        b.bulk_cellared || 0,
        b.bulk_cellared_date || '',
        b.pouch_total_pouches || 0,
        b.pouch_size_oz || 0,
        b.pouch_pouches_open || 0,
        b.pouch_pouches_cellared || 0,
        b.pouch_cellared_date || '',
        b.pouch_total_quantity_oz || 0,
        totalWeight.toFixed(2),
        totalOpen.toFixed(2),
        totalCellared.toFixed(2),
        b.notes || ''
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

  const exportToPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.text(t('export.pdfTitle'), pageWidth / 2, 20, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.text(`${t('export.pdfGenerated')} ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
      // Stats
      doc.setFontSize(12);
      const totalBlends = blends.length;
      const uniqueBrands = [...new Set(blends.map(b => b.manufacturer).filter(Boolean))].length;
      const favoriteBlends = blends.filter(b => b.is_favorite).length;
      
      // Calculate all statistics
      const totalTins = blends.reduce((sum, b) => sum + (b.tin_total_tins || 0), 0);
      const tinWeightOz = blends.reduce((sum, b) => sum + (b.tin_total_quantity_oz || 0), 0);
      const tinOpenOz = blends.reduce((sum, b) => sum + ((b.tin_tins_open || 0) * (b.tin_size_oz || 0)), 0);
      const tinCellaredOz = blends.reduce((sum, b) => sum + ((b.tin_tins_cellared || 0) * (b.tin_size_oz || 0)), 0);
      
      const bulkWeightOz = blends.reduce((sum, b) => sum + (b.bulk_total_quantity_oz || 0), 0);
      const bulkOpenOz = blends.reduce((sum, b) => sum + (b.bulk_open || 0), 0);
      const bulkCellaredOz = blends.reduce((sum, b) => sum + (b.bulk_cellared || 0), 0);
      
      const totalPouches = blends.reduce((sum, b) => sum + (b.pouch_total_pouches || 0), 0);
      const pouchWeightOz = blends.reduce((sum, b) => sum + (b.pouch_total_quantity_oz || 0), 0);
      const pouchOpenOz = blends.reduce((sum, b) => sum + ((b.pouch_pouches_open || 0) * (b.pouch_size_oz || 0)), 0);
      const pouchCellaredOz = blends.reduce((sum, b) => sum + ((b.pouch_pouches_cellared || 0) * (b.pouch_size_oz || 0)), 0);
      
      const totalWeight = tinWeightOz + bulkWeightOz + pouchWeightOz;
      const totalOpenOz = tinOpenOz + bulkOpenOz + pouchOpenOz;
      const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
      
      let y = 40;
      doc.text(`${t('export.pdfTotalBlends')} ${totalBlends}`, 20, y);
      y += 6;
      doc.text(`${t('export.pdfUniqueBrands')} ${uniqueBrands}`, 20, y);
      y += 6;
      doc.text(`${t('export.pdfFavorites')} ${favoriteBlends}`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text(t('export.pdfTinInventory'), 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  ${t('export.pdfTotalTins')} ${totalTins} (${tinWeightOz.toFixed(1)} oz)`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfOpen')} ${tinOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfCellared')} ${tinCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text(t('export.pdfBulkInventory'), 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  ${t('export.pdfTotal')} ${bulkWeightOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfOpen')} ${bulkOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfCellared')} ${bulkCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text(t('export.pdfPouchInventory'), 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  ${t('export.pdfTotalPouches')} ${totalPouches} (${pouchWeightOz.toFixed(1)} oz)`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfOpen')} ${pouchOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfCellared')} ${pouchCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text(t('export.pdfOverallTotals'), 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  ${t('export.pdfTotalWeight')} ${totalWeight.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfTotalOpen')} ${totalOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  ${t('export.pdfTotalCellared')} ${totalCellaredOz.toFixed(1)} oz`, 20, y);
      
      // Blends list
      y += 10;
      doc.setFontSize(14);
      doc.text(t('export.pdfBlendDetails'), 20, y);
      y += 10;
      
      doc.setFontSize(9);
      blends.forEach((blend, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(`${idx + 1}. ${blend.name}`, 20, y);
        doc.setFont(undefined, 'normal');
        y += 5;
        
        if (blend.manufacturer) {
          doc.text(`${t('export.pdfManufacturer')} ${blend.manufacturer}`, 25, y);
          y += 5;
        }
        
        if (blend.blend_type) {
          doc.text(`${t('export.pdfType')} ${blend.blend_type} | ${t('export.csvCut')}: ${blend.cut || 'N/A'} | ${t('export.csvStrength')}: ${blend.strength || 'N/A'}`, 25, y);
          y += 5;
        }
        
        const tinWeight = blend.tin_total_quantity_oz || 0;
        const bulkWeight = blend.bulk_total_quantity_oz || 0;
        const pouchWeight = blend.pouch_total_quantity_oz || 0;
        const totalBlendWeight = tinWeight + bulkWeight + pouchWeight;
        
        if (totalBlendWeight > 0) {
          if (tinWeight > 0) {
            doc.text(`${t('export.pdfTins')} ${blend.tin_total_tins || 0} (${tinWeight.toFixed(2)} oz) - ${blend.tin_tins_open || 0} open, ${blend.tin_tins_cellared || 0} cellared`, 25, y);
            y += 5;
          }
          if (bulkWeight > 0) {
            doc.text(`${t('export.pdfBulk')} ${bulkWeight.toFixed(2)} oz - ${(blend.bulk_open || 0).toFixed(2)} oz open, ${(blend.bulk_cellared || 0).toFixed(2)} oz cellared`, 25, y);
            y += 5;
          }
          if (pouchWeight > 0) {
            doc.text(`${t('export.pdfPouches')} ${blend.pouch_total_pouches || 0} (${pouchWeight.toFixed(2)} oz) - ${blend.pouch_pouches_open || 0} open, ${blend.pouch_pouches_cellared || 0} cellared`, 25, y);
            y += 5;
          }
          doc.text(`${t('export.pdfTotal')} ${totalBlendWeight.toFixed(2)} oz`, 25, y);
          y += 5;
        }
        
        if (blend.rating) {
          doc.text(`${t('export.pdfRating')} ${'★'.repeat(blend.rating)}${'☆'.repeat(5 - blend.rating)}`, 25, y);
          y += 5;
        }
        
        if (blend.notes) {
          const notesLines = doc.splitTextToSize(`${t('export.pdfNotes')} ${blend.notes}`, pageWidth - 50);
          doc.text(notesLines, 25, y);
          y += notesLines.length * 5;
        }
        
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