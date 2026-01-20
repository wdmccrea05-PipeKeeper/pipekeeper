import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, FileText, Table } from "lucide-react";
import { toast } from "sonner";

export default function CollectionReportExporter({ user }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = async () => {
    try {
      setIsExporting(true);
      toast.loading("Generating CSV export...");

      // Fetch all data
      const [pipes, blends, logs] = await Promise.all([
        base44.entities.Pipe.filter({ created_by: user?.email }),
        base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
        base44.entities.SmokingLog.filter({ created_by: user?.email })
      ]);

      // Generate CSV content
      let csv = "Collection Summary\n";
      csv += `Total Pipes,${pipes.length}\n`;
      csv += `Total Blends,${blends.length}\n`;
      csv += `Total Smoking Sessions,${logs.length}\n\n`;

      // Pipes section
      csv += "Pipes\n";
      csv += "Name,Maker,Shape,Bowl Material,Stem Material,Condition,Estimated Value,Purchase Price,Notes\n";
      pipes.forEach(p => {
        csv += `"${p.name || ''}","${p.maker || ''}","${p.shape || ''}","${p.bowl_material || ''}","${p.stem_material || ''}","${p.condition || ''}",${p.estimated_value || ''},${p.purchase_price || ''},"${(p.notes || '').replace(/"/g, '""')}"\n`;
      });

      csv += "\n\nTobacco Blends\n";
      csv += "Name,Manufacturer,Blend Type,Cut,Strength,Room Note,Aging Potential,Rating,Total Tins,Cellared,Notes\n";
      blends.forEach(b => {
        const totalOz = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);
        const cellarOz = ((b.tin_tins_cellared || 0) * (b.tin_size_oz || 0)) + (b.bulk_cellared || 0) + ((b.pouch_pouches_cellared || 0) * (b.pouch_size_oz || 0));
        csv += `"${b.name || ''}","${b.manufacturer || ''}","${b.blend_type || ''}","${b.cut || ''}","${b.strength || ''}","${b.room_note || ''}","${b.aging_potential || ''}",${b.rating || ''},${totalOz},${cellarOz},"${(b.notes || '').replace(/"/g, '""')}"\n`;
      });

      // Create download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PipeKeeper-Collection-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success("CSV export downloaded");
    } catch (error) {
      toast.dismiss();
      toast.error("Export failed: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = () => {
    window.open('/UserReport', '_blank');
  };

  const exportCellarAging = async () => {
    try {
      setIsExporting(true);
      toast.loading("Generating cellar aging report...");

      const [blends, logs] = await Promise.all([
        base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
        base44.entities.CellarLog.filter({ created_by: user?.email })
      ]);

      const cellarBlends = blends.filter(b => {
        const hasCellared = (b.tin_tins_cellared || 0) > 0 || 
                            (b.bulk_cellared || 0) > 0 || 
                            (b.pouch_pouches_cellared || 0) > 0;
        return hasCellared;
      });

      let csv = "Cellar Aging Report\n";
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += "Blend Name,Manufacturer,Blend Type,Cellared Amount (oz),Cellared Date,Age (months),Aging Potential,Recommended Action\n";
      
      cellarBlends.forEach(b => {
        const tinOz = (b.tin_tins_cellared || 0) * (b.tin_size_oz || 0);
        const bulkOz = b.bulk_cellared || 0;
        const pouchOz = (b.pouch_pouches_cellared || 0) * (b.pouch_size_oz || 0);
        const totalCellared = tinOz + bulkOz + pouchOz;
        
        const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
        const oldestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null;
        const ageMonths = oldestDate ? Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
        
        csv += `"${b.name || ''}","${b.manufacturer || ''}","${b.blend_type || ''}",${totalCellared},${oldestDate?.toLocaleDateString() || 'N/A'},${ageMonths},"${b.aging_potential || 'N/A'}","Continue aging"\n`;
      });

      csv += "\n\nCellar Transaction History\n";
      csv += "Date,Blend Name,Transaction Type,Amount (oz),Container Type,Notes\n";
      logs.forEach(log => {
        csv += `${new Date(log.date).toLocaleDateString()},"${log.blend_name || ''}",${log.transaction_type},${log.amount_oz || 0},"${log.container_type || ''}","${(log.notes || '').replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PipeKeeper-Cellar-Aging-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success("Cellar aging report downloaded");
    } catch (error) {
      toast.dismiss();
      toast.error("Export failed: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportSmokingHistory = async () => {
    try {
      setIsExporting(true);
      toast.loading("Generating smoking history report...");

      const logs = await base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date');

      let csv = "Smoking History Report\n";
      csv += `Generated: ${new Date().toLocaleDateString()}\n`;
      csv += `Total Sessions: ${logs.length}\n\n`;
      csv += "Date,Pipe Name,Blend Name,Bowls Smoked,Break-In Session,Notes\n";
      
      logs.forEach(log => {
        csv += `${new Date(log.date).toLocaleDateString()},"${log.pipe_name || ''}","${log.blend_name || ''}",${log.bowls_smoked || 1},${log.is_break_in ? 'Yes' : 'No'},"${(log.notes || '').replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PipeKeeper-Smoking-History-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success("Smoking history report downloaded");
    } catch (error) {
      toast.dismiss();
      toast.error("Export failed: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Button
        onClick={exportPDF}
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
      >
        <FileText className="w-4 h-4 mr-2" />
        PDF Report
      </Button>
      
      <Button
        onClick={exportCSV}
        disabled={isExporting}
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
      >
        <Table className="w-4 h-4 mr-2" />
        {isExporting ? "Exporting..." : "CSV Export"}
      </Button>

      <Button
        onClick={exportCellarAging}
        disabled={isExporting}
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? "Exporting..." : "Cellar Aging Report"}
      </Button>

      <Button
        onClick={exportSmokingHistory}
        disabled={isExporting}
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? "Exporting..." : "Smoking History"}
      </Button>
    </div>
  );
}