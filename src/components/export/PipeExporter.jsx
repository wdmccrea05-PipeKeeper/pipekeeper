import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Shield, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/useCurrency';
import { hasModuleProAccess } from '@/components/utils/moduleEntitlements';

export default function PipeExporter() {
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [loading, setLoading] = useState(false);

  const { user } = useCurrentUser();

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const isPremiumUser = hasModuleProAccess(user, 'pipekeeper');

  const exportToCSV = () => {
    const headers = [
      t('pipeExporter.csvName'), t('pipeExporter.csvMaker'), t('pipeExporter.csvCountry'),
      t('pipeExporter.csvShape'), t('pipeExporter.csvMaterial'), t('pipeExporter.csvFinish'),
      t('pipeExporter.csvLengthMm'), t('pipeExporter.csvWeightG'),
      t('pipeExporter.csvBowlDiamMm'), t('pipeExporter.csvBowlDepthMm'),
      t('pipeExporter.csvChamberVolume'), t('pipeExporter.csvYearMade'),
      t('pipeExporter.csvCondition'), t('pipeExporter.csvPurchasePrice'),
      t('pipeExporter.csvEstimatedValue'), t('pipeExporter.csvNotes'),
    ];

    const rows = pipes.map(p => [
      p.name || '',
      p.maker || '',
      p.country_of_origin || '',
      p.shape || '',
      p.bowl_material || '',
      p.finish || '',
      p.length_mm || '',
      p.weight_grams || '',
      p.bowl_diameter_mm || '',
      p.bowl_depth_mm || '',
      p.chamber_volume || '',
      p.year_made || '',
      p.condition || '',
      p.purchase_price || '',
      p.estimated_value || '',
      p.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipe-collection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const exportInsurancePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Title
      doc.setFontSize(20);
      doc.text(t("pipeExporter.insuranceReportTitle"), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`${t("pipeExporter.generated")} ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`${t("pipeExporter.owner")} ${user?.full_name || user?.email}`, pageWidth / 2, 34, { align: 'center' });
      
      // Summary
      const totalValue = pipes.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0);
      const totalPurchase = pipes.reduce((sum, p) => sum + (Number(p.purchase_price) || 0), 0);
      const fmtMoney = (n) => formatFromBase(Number(n));

      doc.text(`${t("pipeExporter.totalPurchaseValue")} ${fmtMoney(totalPurchase)}`, 20, 58);
      doc.text(`${t("pipeExporter.currentEstimatedValue")} ${fmtMoney(totalValue)}`, 20, 64);
      
      // Individual pipes
      let y = 75;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(t("pipeExporter.individualPipeDetails"), 20, y);
      y += 8;
      
      for (const [idx, pipe] of pipes.entries()) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${idx + 1}. ${pipe.name || t("reports.unnamed")}`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        y += 6;
        
        // Add pipe photos
        if (pipe.photos && pipe.photos.length > 0) {
          try {
            const photoData = await loadImageAsBase64(pipe.photos[0]);
            const imgWidth = 60;
            const imgHeight = 60;
            
            if (y + imgHeight > pageHeight - 20) {
              doc.addPage();
              y = 20;
            }
            
            doc.addImage(photoData, 'JPEG', 25, y, imgWidth, imgHeight);
            y += imgHeight + 5;
          } catch (e) {
            console.error('Failed to load pipe photo:', e);
          }
        }
        
        if (pipe.maker) {
          doc.text(`${t("pipeExporter.makerPrefix")} ${pipe.maker}${pipe.country_of_origin ? ` (${pipe.country_of_origin})` : ''}`, 25, y);
          y += 5;
        }
        
        if (pipe.shape || pipe.bowl_material) {
          doc.text(`${t("pipeExporter.shapePrefix")} ${pipe.shape || 'N/A'} | ${t("pipeExporter.materialPrefix")} ${pipe.bowl_material || 'N/A'}`, 25, y);
          y += 5;
        }
        
        if (pipe.year_made) {
          doc.text(`${t("pipeExporter.yearPrefix")} ${pipe.year_made}`, 25, y);
          y += 5;
        }
        
        if (pipe.condition) {
          doc.text(`${t("pipeExporter.conditionPrefix")} ${pipe.condition}`, 25, y);
          y += 5;
        }
        
        if (pipe.purchase_price || pipe.estimated_value) {
          const pp = pipe.purchase_price ? fmtMoney(pipe.purchase_price) : 'N/A';
          const ev = pipe.estimated_value ? fmtMoney(pipe.estimated_value) : 'N/A';
          doc.setFont(undefined, 'bold');
          doc.text(`${t("pipeExporter.purchasePricePrefix")} ${pp} | ${t("pipeExporter.currentValuePrefix")} ${ev}`, 25, y);
          doc.setFont(undefined, 'normal');
          y += 5;
        }
        
        if (pipe.stamping) {
          doc.text(`${t("pipeExporter.stampingPrefix")} ${pipe.stamping}`, 25, y);
          y += 5;
        }
        
        // Add stamping photos
        if (pipe.stamping_photos && pipe.stamping_photos.length > 0) {
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text(t("pipeExporter.stampingPhotosLabel"), 25, y);
          doc.setFont(undefined, 'normal');
          y += 5;
          
          for (const stampPhoto of pipe.stamping_photos.slice(0, 2)) {
            try {
              const stampData = await loadImageAsBase64(stampPhoto);
              const imgWidth = 50;
              const imgHeight = 50;
              
              if (y + imgHeight > pageHeight - 20) {
                doc.addPage();
                y = 20;
              }
              
              doc.addImage(stampData, 'JPEG', 25, y, imgWidth, imgHeight);
              y += imgHeight + 3;
            } catch (e) {
              console.error('Failed to load stamping photo:', e);
            }
          }
          doc.setFontSize(9);
        }
        
        if (pipe.notes) {
          const notesLines = doc.splitTextToSize(`${t("pipeExporter.notesPrefix")} ${pipe.notes}`, pageWidth - 50);
          if (y + notesLines.length * 5 > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(notesLines, 25, y);
          y += notesLines.length * 5;
        }
        
        y += 8;
      }
      
      doc.save(`pipe-insurance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      // Fix: show user-visible error instead of silently failing
      console.error('Insurance PDF export failed:', error);
      toast.error(t("reports.exportFailed") + ": " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="muted"
        size="sm"
        onClick={exportToCSV}
        disabled={loading || pipes.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("pipesPage.exportCSV")}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={exportInsurancePDF}
        disabled={loading || pipes.length === 0 || !isPremiumUser}
      >
        {!isPremiumUser && <Crown className="w-4 h-4 mr-2 text-amber-500" />}
        <Shield className="w-4 h-4 mr-2" />
        {t("pipesPage.insuranceReport")}
      </Button>
    </div>
  );
}
