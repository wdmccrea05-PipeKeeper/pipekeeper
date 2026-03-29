import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Table, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { calculateTotalOzFromBlend, calculateCellaredOzFromBlend } from "@/components/utils/tobaccoQuantityHelpers";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatCurrency, formatWeight, formatDate } from "@/components/utils/localeFormatters";

export default function CollectionReportExporter({ user }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();
  const [isExporting, setIsExporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const MAX_REPORT_LOGS = 500;

  if (!entitlements.canUse("EXPORT_REPORTS")) {
    return (
      <div className="space-y-4">
        <UpgradePrompt 
          featureName={t("reports.collectionReports")}
          description={t("reports.collectionReportsDesc")}
        />
      </div>
    );
  }

  // NOTE: generatePipeCSV, generatePipePDF, generateInsuranceCSV, and generateInsurancePDF
  // each fetch Pipe data independently. This is a known inefficiency — a shared fetch helper
  // should be introduced in a future refactor if multiple reports are generated per session.
  const generatePipeCSV = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    
    let csv = t("reports.pipeCollectionReportTitle") + "\n";
    csv += t("reports.generated") + `: ${formatDate(new Date(), 'short')}\n`;
    csv += t("reports.totalPipes") + `: ${pipes.length}\n\n`;
    csv += `${t("common.name")},${t("pipesExtended.maker")},${t("pipesExtended.country")},${t("pipesExtended.shape")},${t("pipesExtended.bowlMaterial")},${t("pipesExtended.stemMaterial")},${t("pipesExtended.length")} (mm),${t("pipesExtended.weight")} (g),${t("pipesExtended.chamberVolume")},${t("pipesExtended.condition")},${t("reports.purchasePrice")},${t("reports.estimatedValue")},${t("reports.yearMade")},${t("common.notes")}\n`;
    
    pipes.forEach(p => {
      csv += `"${p.name || ''}","${p.maker || ''}","${p.country_of_origin || ''}","${p.shape || ''}","${p.bowl_material || ''}","${p.stem_material || ''}",${p.length_mm || ''},${p.weight_grams || ''},"${p.chamber_volume || ''}","${p.condition || ''}",${p.purchase_price || ''},${p.estimated_value || ''},"${p.year_made || ''}","${(p.notes || '').replace(/"/g, '""')}"\n`;
    });

    return { csv, filename: `Pipe-Collection-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generatePipePDF = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

    let html = `<div style="font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a;">
      <h1 style="color: #0a0a0a; font-weight: bold; font-size: 28px;">${t("reports.pipeCollectionReportTitle")}</h1>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.generated")}:</strong> ${formatDate(new Date(), 'short')}</p>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.totalPipes")}:</strong> ${pipes.length}</p>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.totalValue")}:</strong> ${formatCurrency(totalValue)}</p>
      <hr style="margin: 20px 0; border-color: #ccc;">`;

    pipes.forEach(p => {
      html += `<div style="margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
        <h3 style="color: #1a1a1a; margin-bottom: 10px; font-weight: bold; font-size: 16px;">${p.name || t("reports.unnamedPipe")}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; width: 150px; font-weight: 600; color: #1a1a1a;"><strong>${t("pipesExtended.maker")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${p.maker || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("pipesExtended.shape")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${p.shape || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("reports.materials")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${p.bowl_material || '-'} / ${p.stem_material || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("pipesExtended.condition")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${p.condition || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("common.value")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 600;">${formatCurrency(p.estimated_value || 0)}</td></tr>
        </table>
      </div>`;
    });

    html += `</div>`;
    return html;
  };

  const generateTobaccoCSV = async () => {
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
    
    let csv = t("reports.tobaccoCollectionReportTitle") + "\n";
    csv += t("reports.generated") + `: ${formatDate(new Date(), 'short')}\n`;
    csv += t("reports.totalBlends") + `: ${blends.length}\n\n`;
    csv += `${t("common.name")},${t("tobaccoExtended.manufacturer")},${t("tobaccoExtended.blendType")},${t("tobaccoExtended.cut")},${t("tobaccoExtended.strength")},${t("tobaccoExtended.roomNote")},${t("tobaccoExtended.agingPotential")},${t("common.rating")},${t("reports.tinQuantity")},${t("reports.bulkQuantity")},${t("reports.pouchQuantity")},${t("reports.total")} (oz),${t("reports.cellared")} (oz),${t("common.notes")}\n`;
    
    blends.forEach(b => {
      const tinOz = b.tin_total_quantity_oz || 0;
      const bulkOz = b.bulk_total_quantity_oz || 0;
      const pouchOz = b.pouch_total_quantity_oz || 0;
      const totalOz = calculateTotalOzFromBlend(b);
      const cellarOz = calculateCellaredOzFromBlend(b);
      csv += `"${b.name || ''}","${b.manufacturer || ''}","${b.blend_type || ''}","${b.cut || ''}","${b.strength || ''}","${b.room_note || ''}","${b.aging_potential || ''}",${b.rating || ''},${tinOz.toFixed(1)},${bulkOz.toFixed(1)},${pouchOz.toFixed(1)},${totalOz.toFixed(1)},${cellarOz.toFixed(1)},"${(b.notes || '').replace(/"/g, '""')}"\n`;
    });

    return { csv, filename: `Tobacco-Collection-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateTobaccoPDF = async () => {
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });

    let html = `<div style="font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a;">
      <h1 style="color: #0a0a0a; font-weight: bold; font-size: 28px;">${t("reports.tobaccoCollectionReportTitle")}</h1>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.generated")}:</strong> ${formatDate(new Date(), 'short')}</p>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.totalBlends")}:</strong> ${blends.length}</p>
      <hr style="margin: 20px 0; border-color: #ccc;">`;

    blends.forEach(b => {
      const totalOz = calculateTotalOzFromBlend(b);
      const cellaredOz = calculateCellaredOzFromBlend(b);
      html += `<div style="margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
        <h3 style="color: #1a1a1a; margin-bottom: 10px; font-weight: bold; font-size: 16px;">${b.name || t("reports.unnamedBlend")}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; width: 150px; font-weight: 600; color: #1a1a1a;"><strong>${t("tobaccoExtended.manufacturer")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${b.manufacturer || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("common.type")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${b.blend_type || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("tobaccoExtended.strength")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${b.strength || '-'}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("reports.totalQuantity")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${formatWeight(totalOz, 'oz')}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("reports.cellared")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${formatWeight(cellaredOz, 'oz')}</td></tr>
          <tr><td style="padding: 8px; font-weight: 600; color: #1a1a1a;"><strong>${t("common.rating")}:</strong></td><td style="padding: 8px; color: #1a1a1a; font-weight: 500;">${b.rating || '-'} / 5</td></tr>
        </table>
      </div>`;
    });

    html += `</div>`;
    return html;
  };

  const generateInsuranceCSV = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    
    let csv = t("reports.insuranceValuationReport") + "\n";
    csv += t("reports.generated") + `: ${formatDate(new Date(), 'short')}\n`;
    csv += t("reports.owner") + `: ${user?.full_name || user?.email}\n`;
    csv += t("reports.totalCollectionValue") + `: ${formatCurrency(totalValue)}\n\n`;
    csv += `${t("reports.item")},${t("pipesExtended.maker")},${t("reports.year")},${t("pipesExtended.condition")},${t("reports.purchaseDate")},${t("reports.purchasePrice")},${t("reports.currentValue")},${t("common.description")}\n`;
    
    pipes.forEach(p => {
      csv += `"${p.name || ''}","${p.maker || ''}","${p.year_made || ''}","${p.condition || ''}","${p.created_date ? formatDate(new Date(p.created_date), 'short') : ''}",${p.purchase_price || ''},${p.estimated_value || ''},"${p.shape || ''} ${t("reports.pipe")}, ${p.bowl_material || ''} ${t("reports.bowl")}, ${p.stem_material || ''} ${t("reports.stem")}"\n`;
    });

    return { csv, filename: `Insurance-Report-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateInsurancePDF = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
    const totalPipesValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const totalBlendsValue = blends.reduce((sum, b) => sum + (b.manual_market_value || b.ai_estimated_value || 0), 0);
    const totalValue = totalPipesValue + totalBlendsValue;

    let html = `<div style="font-family: Arial, sans-serif; padding: 20px 30px; color: #1a1a1a;">
      <h1 style="color: #0a0a0a; font-weight: bold; font-size: 24px; margin: 0 0 10px 0;">${t("reports.insuranceValuationReport")}</h1>
      <p style="color: #1a1a1a; font-weight: 600; margin: 4px 0;"><strong>${t("reports.generated")}:</strong> ${formatDate(new Date(), 'short')}</p>
      <p style="color: #1a1a1a; font-weight: 600; margin: 4px 0;"><strong>${t("reports.owner")}:</strong> ${user?.full_name || user?.email}</p>
      <p style="color: #1a1a1a; font-weight: 600; margin: 4px 0;"><strong>${t("reports.totalCollectionValue")}:</strong> $${(totalValue || 0).toFixed(2)}</p>
      <hr style="margin: 12px 0;">
      <p style="font-style: italic; color: #333333; font-weight: 500; margin: 8px 0; font-size: 13px;">${t("reports.insuranceReportDesc")}</p>`;

    pipes.forEach(p => {
      html += `<div style="margin-bottom: 12px; border: 1px solid #ddd; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
        <h3 style="color: #0a0a0a; font-weight: bold; font-size: 14px; margin: 0 0 8px 0;">${p.name || t("reports.unnamed")}</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; font-size: 12px;">
          <div>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("pipesExtended.maker")}:</strong> ${p.maker || '-'}</p>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("pipesExtended.shape")}:</strong> ${p.shape || '-'}</p>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("pipesExtended.condition")}:</strong> ${p.condition || '-'}</p>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("common.value")}:</strong> $${(p.estimated_value || 0).toFixed(2)}</p>
          </div>
          <div>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("pipesExtended.length")}:</strong> ${p.length_mm ? (p.length_mm).toFixed(2) : '-'} mm</p>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("pipesExtended.weight")}:</strong> ${p.weight_grams ? (p.weight_grams).toFixed(2) : '-'} g</p>
            <p style="color: #1a1a1a; font-weight: 600; margin: 3px 0;"><strong>${t("reports.yearMade")}:</strong> ${p.year_made || '-'}</p>
          </div>
        </div>

        ${p.photos && p.photos.length > 0 ? `
        <div style="margin-bottom: 8px;">
          <img src="${p.photos[0]}" style="width: 100%; object-fit: contain; max-height: 180px; border: 1px solid #ddd; border-radius: 3px;" />
        </div>
        ` : ''}

        ${p.stamping_photos && p.stamping_photos.length > 0 ? `
        <div style="margin-bottom: 8px;">
          <img src="${p.stamping_photos[0]}" style="width: 100%; object-fit: contain; max-height: 120px; border: 1px solid #ddd; border-radius: 3px;" />
        </div>
        ` : ''}
        ${p.stamping ? `<p style="color: #1a1a1a; font-weight: 600; margin: 3px 0; font-size: 11px;"><strong>Stamping:</strong> ${p.stamping}</p>` : ''}
        ${p.notes ? `<p style="color: #1a1a1a; margin: 3px 0; font-size: 11px;">${p.notes.substring(0, 100)}${p.notes.length > 100 ? '...' : ''}</p>` : ''}
      </div>`;
    });

    if (blends.length > 0) {
      html += `<h2 style="color: #0a0a0a; font-weight: bold; font-size: 16px; margin: 20px 0 10px 0;">Tobacco Blends</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #e8e8e8;">
              <th style="border: 1px solid #999; padding: 6px; text-align: left; font-weight: bold; color: #1a1a1a; width: 60px;">Logo</th>
              <th style="border: 1px solid #999; padding: 6px; text-align: left; font-weight: bold; color: #1a1a1a;">Blend Name</th>
              <th style="border: 1px solid #999; padding: 6px; text-align: center; font-weight: bold; color: #1a1a1a; width: 70px;">Ounces</th>
              <th style="border: 1px solid #999; padding: 6px; text-align: center; font-weight: bold; color: #1a1a1a; width: 60px;">Age</th>
              <th style="border: 1px solid #999; padding: 6px; text-align: right; font-weight: bold; color: #1a1a1a; width: 70px;">Value</th>
            </tr>
          </thead>
          <tbody>`;

      blends.forEach(b => {
        const blendValue = b.manual_market_value || b.ai_estimated_value || 0;
        const totalQty = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);
        const age = b.tin_cellared_date ? Math.floor((new Date() - new Date(b.tin_cellared_date)) / (1000 * 60 * 60 * 24 * 365)) : (b.bulk_cellared_date ? Math.floor((new Date() - new Date(b.bulk_cellared_date)) / (1000 * 60 * 60 * 24 * 365)) : null);
        
        html += `<tr style="border-bottom: 1px solid #ddd;">
          <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${b.logo ? `<img src="${b.logo}" style="width: 50px; height: 40px; object-fit: contain;" />` : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 4px; color: #1a1a1a;">${b.name || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 4px; text-align: center; color: #1a1a1a;">${totalQty.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 4px; text-align: center; color: #1a1a1a;">${age !== null ? age + ' yr' : '-'}</td>
          <td style="border: 1px solid #ddd; padding: 4px; text-align: right; color: #1a1a1a; font-weight: 600;">$${(blendValue).toFixed(2)}</td>
        </tr>`;
      });

      html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
  };

  const generateStatsCSV = async () => {
    const [pipes, blends, logs] = await Promise.all([
      base44.entities.Pipe.filter({ created_by: user?.email }),
      base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
      base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', MAX_REPORT_LOGS)
    ]);

    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const totalOz = blends.reduce((sum, b) => sum + calculateTotalOzFromBlend(b), 0);

    let csv = t("reports.collectionStatisticsReport") + "\n";
    csv += t("reports.generated") + `: ${formatDate(new Date(), 'short')}\n\n`;
    csv += t("reports.pipeCollectionSection") + "\n";
    csv += `${t("reports.totalPipes")},${pipes.length}\n`;
    csv += `${t("reports.totalValue")},${formatCurrency(totalValue)}\n`;
    csv += `${t("reports.avgValuePerPipe")},${pipes.length > 0 ? formatCurrency(Math.round(totalValue / pipes.length)) : formatCurrency(0)}\n\n`;
    
    csv += t("reports.tobaccoCollectionSection") + "\n";
    csv += `${t("reports.totalBlends")},${blends.length}\n`;
    csv += `${t("reports.totalQuantity")},${formatWeight(totalOz, 'oz')}\n\n`;
    
    csv += t("reports.usageActivitySection") + "\n";
    csv += `${t("reports.totalSessions")},${logs.length}\n`;
    csv += `${t("reports.breakInSessions")},${logs.filter(l => l.is_break_in).length}\n`;

    return { csv, filename: `Collection-Stats-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateStatsPDF = async () => {
    const [pipes, blends, logs] = await Promise.all([
      base44.entities.Pipe.filter({ created_by: user?.email }),
      base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
      base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', MAX_REPORT_LOGS)
    ]);

    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const totalOz = blends.reduce((sum, b) => sum + calculateTotalOzFromBlend(b), 0);

    let html = `<div style="font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a;">
      <h1 style="color: #0a0a0a; font-weight: bold; font-size: 28px;">${t("reports.collectionStatisticsReport")}</h1>
      <p style="color: #1a1a1a; font-weight: 600;"><strong>${t("reports.generated")}:</strong> ${formatDate(new Date(), 'short')}</p>
      <hr style="margin: 20px 0; border-color: #ccc;">

      <h2 style="color: #1a1a1a; font-weight: bold; font-size: 18px;">${t("reports.pipeCollectionSection")}</h2>
      <ul style="color: #1a1a1a; font-weight: 500; line-height: 1.8;">
        <li>${t("reports.totalPipes")}: ${pipes.length}</li>
        <li>${t("reports.totalValue")}: ${formatCurrency(totalValue)}</li>
        <li>${t("reports.avgValue")}: ${pipes.length > 0 ? formatCurrency(Math.round(totalValue / pipes.length)) : formatCurrency(0)}</li>
      </ul>

      <h2 style="color: #1a1a1a; font-weight: bold; font-size: 18px; margin-top: 20px;">${t("reports.tobaccoCollectionSection")}</h2>
      <ul style="color: #1a1a1a; font-weight: 500; line-height: 1.8;">
        <li>${t("reports.totalBlends")}: ${blends.length}</li>
        <li>${t("reports.totalQuantity")}: ${formatWeight(totalOz, 'oz')}</li>
      </ul>

      <h2 style="color: #1a1a1a; font-weight: bold; font-size: 18px; margin-top: 20px;">${t("reports.usageActivitySection")}</h2>
      <ul style="color: #1a1a1a; font-weight: 500; line-height: 1.8;">
        <li>${t("reports.totalSessions")}: ${logs.length}</li>
        <li>${t("reports.breakInSessions")}: ${logs.filter(l => l.is_break_in).length}</li>
      </ul>
    </div>`;

    return html;
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(t("reports.csvDownloaded"));
  };

  const previewPDF = (html, title) => {
    setPdfPreview(html);
    setPreviewTitle(title);
  };

  const downloadPDF = () => {
    if (!pdfPreview) return;
    const printWindow = window.open('', '_blank');

    // Guard against popup blockers
    if (!printWindow) {
      toast.error(t("reports.popupBlocked"));
      return;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${pdfPreview}</body></html>`);
    printWindow.document.close();

    // Wait for the window to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const downloadPDFAsFile = () => {
    if (!pdfPreview) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t("reports.popupBlocked"));
      return;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: Arial, sans-serif; margin: 0; padding: 20px; } @media print { body { margin: 0; padding: 0; } }</style></head><body>${pdfPreview}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 100);
    };
  };

  const handleReport = async (type, format) => {
    try {
      setIsExporting(true);
      
      if (type === 'pipe') {
        if (format === 'csv') {
          const { csv, filename } = await generatePipeCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generatePipePDF();
          previewPDF(html, t("reports.pipeCollectionReportTitle"));
        }
      } else if (type === 'tobacco') {
        if (format === 'csv') {
          const { csv, filename } = await generateTobaccoCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateTobaccoPDF();
          previewPDF(html, t("reports.tobaccoCollectionReportTitle"));
        }
      } else if (type === 'insurance') {
        if (format === 'csv') {
          const { csv, filename } = await generateInsuranceCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateInsurancePDF();
          previewPDF(html, t("reports.insuranceValuationReport"));
        }
      } else if (type === 'stats') {
        if (format === 'csv') {
          const { csv, filename } = await generateStatsCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateStatsPDF();
          previewPDF(html, t("reports.collectionStatisticsReport"));
        }
      }
    } catch (error) {
      toast.error(t("reports.exportFailed") + ": " + error.message);
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <>
      <div className="bg-gradient-to-br from-[#3a2a20] to-[#2a1a10] border border-[#8b6239]/30 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-[#E0D8C8] mb-3">{t("reports.collectionReports")}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pipe Collection Report */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("reports.pipeCollectionReport")}
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            <DropdownMenuItem onClick={() => handleReport('pipe', 'csv')}>
              <Table className="w-4 h-4 mr-2" />
              {t("reports.downloadCSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReport('pipe', 'pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.previewPDF")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tobacco Collection Report */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("reports.tobaccoCollectionReport")}
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            <DropdownMenuItem onClick={() => handleReport('tobacco', 'csv')}>
              <Table className="w-4 h-4 mr-2" />
              {t("reports.downloadCSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReport('tobacco', 'pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.previewPDF")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Insurance Report */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("reports.insuranceReport")}
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            <DropdownMenuItem onClick={() => handleReport('insurance', 'csv')}>
              <Table className="w-4 h-4 mr-2" />
              {t("reports.downloadCSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReport('insurance', 'pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.previewPDF")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Stats Report */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("reports.collectionStatsReport")}
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[200px]">
            <DropdownMenuItem onClick={() => handleReport('stats', 'csv')}>
              <Table className="w-4 h-4 mr-2" />
              {t("reports.downloadCSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReport('stats', 'pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.previewPDF")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreview} onOpenChange={() => setPdfPreview(null)}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>{previewTitle}</span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setPdfPreview(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 w-full rounded-md border p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: pdfPreview }} />
          </ScrollArea>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setPdfPreview(null)}>
              {t("forms.cancel")}
            </Button>
            <Button variant="outline" onClick={downloadPDFAsFile}>
              <Download className="w-4 h-4 mr-2" />
              {t("reports.savePDF") || "Save as PDF"}
            </Button>
            <Button onClick={downloadPDF}>
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.printDownloadPDF")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}