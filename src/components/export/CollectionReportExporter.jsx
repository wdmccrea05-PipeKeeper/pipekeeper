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
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#2c4f7c] hover:bg-[#1e3a5f]/10"
        disabled
      >
        <Download className="w-4 h-4 mr-2" />
        Cellar Aging Report
      </Button>

      <Button
        variant="outline"
        className="w-full justify-start border-[#1e3a5f]/30 text-[#2c4f7c] hover:bg-[#1e3a5f]/10"
        disabled
      >
        <Download className="w-4 h-4 mr-2" />
        Smoking History
      </Button>
    </div>
  );
}