import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Table, X } from "lucide-react";
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

export default function CollectionReportExporter({ user }) {
  const { t } = useTranslation();
  const entitlements = useEntitlements();

  if (!entitlements.canUse("EXPORT_REPORTS")) {
    return (
      <div className="space-y-4">
        <UpgradePrompt 
          featureName={t("reports.collectionReports","Collection Reports")}
          description={t("reports.collectionReportsDesc","Export detailed collection reports including pipe inventory, tobacco cellar, insurance valuations, and statistics. Requires Pro tier.")}
        />
      </div>
    );
  }
  const [isExporting, setIsExporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const generatePipeCSV = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    
    let csv = t("reports.pipeCollectionReportTitle","Pipe Collection Report") + "\n";
    csv += t("reports.generated","Generated") + `: ${new Date().toLocaleDateString()}\n`;
    csv += t("reports.totalPipes","Total Pipes") + `: ${pipes.length}\n\n`;
    csv += `${t("common.name","Name")},${t("pipesExtended.maker","Maker")},${t("pipesExtended.country","Country")},${t("pipesExtended.shape","Shape")},${t("pipesExtended.bowlMaterial","Bowl Material")},${t("pipesExtended.stemMaterial","Stem Material")},${t("pipesExtended.length","Length")} (mm),${t("pipesExtended.weight","Weight")} (g),${t("pipesExtended.chamberVolume","Chamber Volume")},${t("pipesExtended.condition","Condition")},${t("reports.purchasePrice","Purchase Price")},${t("reports.estimatedValue","Estimated Value")},${t("reports.yearMade","Year Made")},${t("common.notes","Notes")}\n`;
    
    pipes.forEach(p => {
      csv += `"${p.name || ''}","${p.maker || ''}","${p.country_of_origin || ''}","${p.shape || ''}","${p.bowl_material || ''}","${p.stem_material || ''}",${p.length_mm || ''},${p.weight_grams || ''},"${p.chamber_volume || ''}","${p.condition || ''}",${p.purchase_price || ''},${p.estimated_value || ''},"${p.year_made || ''}","${(p.notes || '').replace(/"/g, '""')}"\n`;
    });

    return { csv, filename: `Pipe-Collection-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generatePipePDF = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    
    let html = `<div style="font-family: Arial, sans-serif; padding: 40px;">
      <h1 style="color: #1a2c42;">${t("reports.pipeCollectionReportTitle","Pipe Collection Report")}</h1>
      <p><strong>${t("reports.generated","Generated")}:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>${t("reports.totalPipes","Total Pipes")}:</strong> ${pipes.length}</p>
      <p><strong>${t("reports.totalValue","Total Value")}:</strong> $${totalValue.toLocaleString()}</p>
      <hr style="margin: 20px 0;">`;
    
    pipes.forEach(p => {
      html += `<div style="margin-bottom: 30px; border-bottom: 1px solid #ddd; padding-bottom: 20px;">
        <h3 style="color: #8b3a3a; margin-bottom: 10px;">${p.name || t("reports.unnamedPipe","Unnamed Pipe")}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px; width: 150px;"><strong>${t("pipesExtended.maker","Maker")}:</strong></td><td>${p.maker || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("pipesExtended.shape","Shape")}:</strong></td><td>${p.shape || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("reports.materials","Materials")}:</strong></td><td>${p.bowl_material || '-'} / ${p.stem_material || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("pipesExtended.condition","Condition")}:</strong></td><td>${p.condition || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("common.value","Value")}:</strong></td><td>$${p.estimated_value || 0}</td></tr>
        </table>
      </div>`;
    });
    
    html += `</div>`;
    return html;
  };

  const generateTobaccoCSV = async () => {
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
    
    let csv = t("reports.tobaccoCollectionReportTitle","Tobacco Collection Report") + "\n";
    csv += t("reports.generated","Generated") + `: ${new Date().toLocaleDateString()}\n`;
    csv += t("reports.totalBlends","Total Blends") + `: ${blends.length}\n\n`;
    csv += `${t("common.name","Name")},${t("tobaccoExtended.manufacturer","Manufacturer")},${t("tobaccoExtended.blendType","Blend Type")},${t("tobaccoExtended.cut","Cut")},${t("tobaccoExtended.strength","Strength")},${t("tobaccoExtended.roomNote","Room Note")},${t("tobaccoExtended.agingPotential","Aging Potential")},${t("common.rating","Rating")},${t("reports.tinQuantity","Tin Quantity (oz)")},${t("reports.bulkQuantity","Bulk Quantity (oz)")},${t("reports.pouchQuantity","Pouch Quantity (oz)")},${t("reports.total","Total")} (oz),${t("reports.cellared","Cellared")} (oz),${t("common.notes","Notes")}\n`;
    
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
    
    let html = `<div style="font-family: Arial, sans-serif; padding: 40px;">
      <h1 style="color: #1a2c42;">${t("reports.tobaccoCollectionReportTitle","Tobacco Collection Report")}</h1>
      <p><strong>${t("reports.generated","Generated")}:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>${t("reports.totalBlends","Total Blends")}:</strong> ${blends.length}</p>
      <hr style="margin: 20px 0;">`;
    
    blends.forEach(b => {
      const totalOz = calculateTotalOzFromBlend(b);
      const cellaredOz = calculateCellaredOzFromBlend(b);
      html += `<div style="margin-bottom: 30px; border-bottom: 1px solid #ddd; padding-bottom: 20px;">
        <h3 style="color: #3d5a4d; margin-bottom: 10px;">${b.name || t("reports.unnamedBlend","Unnamed Blend")}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px; width: 150px;"><strong>${t("tobaccoExtended.manufacturer","Manufacturer")}:</strong></td><td>${b.manufacturer || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("common.type","Type")}:</strong></td><td>${b.blend_type || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("tobaccoExtended.strength","Strength")}:</strong></td><td>${b.strength || '-'}</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("reports.totalQuantity","Total Quantity")}:</strong></td><td>${totalOz.toFixed(1)} oz</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("reports.cellared","Cellared")}:</strong></td><td>${cellaredOz.toFixed(1)} oz</td></tr>
          <tr><td style="padding: 5px;"><strong>${t("common.rating","Rating")}:</strong></td><td>${b.rating || '-'} / 5</td></tr>
        </table>
      </div>`;
    });
    
    html += `</div>`;
    return html;
  };

  const generateInsuranceCSV = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    
    let csv = t("reports.insuranceValuationReport","Insurance Valuation Report") + "\n";
    csv += t("reports.generated","Generated") + `: ${new Date().toLocaleDateString()}\n`;
    csv += t("reports.owner","Owner") + `: ${user?.full_name || user?.email}\n`;
    csv += t("reports.totalCollectionValue","Total Collection Value") + `: $${totalValue.toLocaleString()}\n\n`;
    csv += `${t("reports.item","Item")},${t("pipesExtended.maker","Maker")},${t("reports.year","Year")},${t("pipesExtended.condition","Condition")},${t("reports.purchaseDate","Purchase Date")},${t("reports.purchasePrice","Purchase Price")},${t("reports.currentValue","Current Value")},${t("common.description","Description")}\n`;
    
    pipes.forEach(p => {
      csv += `"${p.name || ''}","${p.maker || ''}","${p.year_made || ''}","${p.condition || ''}","${p.created_date ? new Date(p.created_date).toLocaleDateString() : ''}",${p.purchase_price || ''},${p.estimated_value || ''},"${p.shape || ''} ${t("reports.pipe","pipe")}, ${p.bowl_material || ''} ${t("reports.bowl","bowl")}, ${p.stem_material || ''} ${t("reports.stem","stem")}"\n`;
    });

    return { csv, filename: `Insurance-Report-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateInsurancePDF = async () => {
    const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    
    let html = `<div style="font-family: Arial, sans-serif; padding: 40px;">
      <h1 style="color: #1a2c42;">${t("reports.insuranceValuationReport","Insurance Valuation Report")}</h1>
      <p><strong>${t("reports.generated","Generated")}:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>${t("reports.owner","Owner")}:</strong> ${user?.full_name || user?.email}</p>
      <p><strong>${t("reports.totalCollectionValue","Total Collection Value")}:</strong> $${totalValue.toLocaleString()}</p>
      <hr style="margin: 20px 0;">
      <p style="font-style: italic; color: #666;">${t("reports.insuranceReportDesc","This report provides an itemized valuation of the pipe collection for insurance purposes.")}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${t("reports.item","Item")}</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${t("pipesExtended.maker","Maker")}</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${t("pipesExtended.condition","Condition")}</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t("common.value","Value")}</th>
          </tr>
        </thead>
        <tbody>`;
    
    pipes.forEach(p => {
      html += `<tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.name || t("reports.unnamed","Unnamed")}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.maker || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.condition || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${(p.estimated_value || 0).toLocaleString()}</td>
      </tr>`;
    });
    
    html += `</tbody></table></div>`;
    return html;
  };

  const generateStatsCSV = async () => {
    const [pipes, blends, logs] = await Promise.all([
      base44.entities.Pipe.filter({ created_by: user?.email }),
      base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
      base44.entities.SmokingLog.filter({ created_by: user?.email })
    ]);

    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const totalOz = blends.reduce((sum, b) => sum + calculateTotalOzFromBlend(b), 0);

    let csv = t("reports.collectionStatisticsReport","Collection Statistics Report") + "\n";
    csv += t("reports.generated","Generated") + `: ${new Date().toLocaleDateString()}\n\n`;
    csv += t("reports.pipeCollectionSection","PIPE COLLECTION") + "\n";
    csv += `${t("reports.totalPipes","Total Pipes")},${pipes.length}\n`;
    csv += `${t("reports.totalValue","Total Value")},$${totalValue.toLocaleString()}\n`;
    csv += `${t("reports.avgValuePerPipe","Average Value per Pipe")},$${pipes.length > 0 ? Math.round(totalValue / pipes.length) : 0}\n\n`;
    
    csv += t("reports.tobaccoCollectionSection","TOBACCO COLLECTION") + "\n";
    csv += `${t("reports.totalBlends","Total Blends")},${blends.length}\n`;
    csv += `${t("reports.totalQuantity","Total Quantity")},${totalOz.toFixed(1)} oz\n\n`;
    
    csv += t("reports.usageActivitySection","USAGE ACTIVITY") + "\n";
    csv += `${t("reports.totalSessions","Total Sessions")},${logs.length}\n`;
    csv += `${t("reports.breakInSessions","Break-In Sessions")},${logs.filter(l => l.is_break_in).length}\n`;

    return { csv, filename: `Collection-Stats-${new Date().toISOString().split('T')[0]}.csv` };
  };

  const generateStatsPDF = async () => {
    const [pipes, blends, logs] = await Promise.all([
      base44.entities.Pipe.filter({ created_by: user?.email }),
      base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
      base44.entities.SmokingLog.filter({ created_by: user?.email })
    ]);

    const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
    const totalOz = blends.reduce((sum, b) => sum + calculateTotalOzFromBlend(b), 0);
    
    let html = `<div style="font-family: Arial, sans-serif; padding: 40px;">
      <h1 style="color: #1a2c42;">${t("reports.collectionStatisticsReport","Collection Statistics Report")}</h1>
      <p><strong>${t("reports.generated","Generated")}:</strong> ${new Date().toLocaleDateString()}</p>
      <hr style="margin: 20px 0;">
      
      <h2 style="color: #8b3a3a;">${t("reports.pipeCollectionSection","Pipe Collection")}</h2>
      <ul>
        <li>${t("reports.totalPipes","Total Pipes")}: ${pipes.length}</li>
        <li>${t("reports.totalValue","Total Value")}: $${totalValue.toLocaleString()}</li>
        <li>${t("reports.avgValue","Average Value")}: $${pipes.length > 0 ? Math.round(totalValue / pipes.length) : 0}</li>
      </ul>
      
      <h2 style="color: #3d5a4d;">${t("reports.tobaccoCollectionSection","Tobacco Collection")}</h2>
      <ul>
        <li>${t("reports.totalBlends","Total Blends")}: ${blends.length}</li>
        <li>${t("reports.totalQuantity","Total Quantity")}: ${totalOz.toFixed(1)} oz</li>
      </ul>
      
      <h2 style="color: #1a2c42;">${t("reports.usageActivitySection","Usage Activity")}</h2>
      <ul>
        <li>${t("reports.totalSessions","Total Sessions")}: ${logs.length}</li>
        <li>${t("reports.breakInSessions","Break-In Sessions")}: ${logs.filter(l => l.is_break_in).length}</li>
      </ul>
    </div>`;
    
    return html;
  };

  const exportPDF = () => {
    window.open('/UserReport', '_blank');
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
    toast.success(t("reports.csvDownloaded","CSV downloaded"));
  };

  const previewPDF = (html, title) => {
    setPdfPreview(html);
    setPreviewTitle(title);
  };

  const downloadPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfPreview);
    printWindow.document.close();
    printWindow.print();
    setPdfPreview(null);
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
          previewPDF(html, t("reports.pipeCollectionReportTitle","Pipe Collection Report"));
        }
      } else if (type === 'tobacco') {
        if (format === 'csv') {
          const { csv, filename } = await generateTobaccoCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateTobaccoPDF();
          previewPDF(html, t("reports.tobaccoCollectionReportTitle","Tobacco Collection Report"));
        }
      } else if (type === 'insurance') {
        if (format === 'csv') {
          const { csv, filename } = await generateInsuranceCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateInsurancePDF();
          previewPDF(html, t("reports.insuranceValuationReport","Insurance Valuation Report"));
        }
      } else if (type === 'stats') {
        if (format === 'csv') {
          const { csv, filename } = await generateStatsCSV();
          downloadCSV(csv, filename);
        } else {
          const html = await generateStatsPDF();
          previewPDF(html, t("reports.collectionStatisticsReport","Collection Statistics Report"));
        }
      }
    } catch (error) {
      toast.error(t("reports.exportFailed","Export failed") + ": " + error.message);
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pipe Collection Report */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isExporting}
              variant="outline"
              className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.pipeCollectionReport")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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
            <Button
              disabled={isExporting}
              variant="outline"
              className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.tobaccoCollectionReport")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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
            <Button
              disabled={isExporting}
              variant="outline"
              className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.insuranceReport")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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
            <Button
              disabled={isExporting}
              variant="outline"
              className="w-full justify-start border-[#1e3a5f]/30 text-[#E0D8C8] hover:bg-[#1e3a5f]/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("reports.collectionStatsReport")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
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

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreview} onOpenChange={() => setPdfPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
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
          
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <div dangerouslySetInnerHTML={{ __html: pdfPreview }} />
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfPreview(null)}>
              {t("forms.cancel")}
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