import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';

export default function PipeExporter() {
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const exportToCSV = () => {
    const headers = [
      'Name', 'Maker', 'Country', 'Shape', 'Material', 'Finish', 'Length (mm)', 
      'Weight (g)', 'Bowl Diameter (mm)', 'Bowl Depth (mm)', 'Chamber Volume',
      'Year Made', 'Condition', 'Purchase Price', 'Estimated Value', 'Notes'
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

  const exportInsurancePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.text('Pipe Collection - Insurance Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Owner: ${user?.full_name || user?.email}`, pageWidth / 2, 34, { align: 'center' });
      
      // Summary
      const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
      const totalPurchase = pipes.reduce((sum, p) => sum + (p.purchase_price || 0), 0);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Collection Summary', 20, 45);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Total Pipes: ${pipes.length}`, 20, 52);
      doc.text(`Total Purchase Value: $${totalPurchase.toLocaleString()}`, 20, 58);
      doc.text(`Current Estimated Value: $${totalValue.toLocaleString()}`, 20, 64);
      
      // Individual pipes
      let y = 75;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Individual Pipe Details:', 20, y);
      y += 8;
      
      for (const [idx, pipe] of pipes.entries()) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${idx + 1}. ${pipe.name}`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        y += 6;
        
        if (pipe.maker) {
          doc.text(`Maker: ${pipe.maker}${pipe.country_of_origin ? ` (${pipe.country_of_origin})` : ''}`, 25, y);
          y += 5;
        }
        
        if (pipe.shape || pipe.bowl_material) {
          doc.text(`Shape: ${pipe.shape || 'N/A'} | Material: ${pipe.bowl_material || 'N/A'}`, 25, y);
          y += 5;
        }
        
        if (pipe.year_made) {
          doc.text(`Year: ${pipe.year_made}`, 25, y);
          y += 5;
        }
        
        if (pipe.condition) {
          doc.text(`Condition: ${pipe.condition}`, 25, y);
          y += 5;
        }
        
        if (pipe.purchase_price || pipe.estimated_value) {
          doc.setFont(undefined, 'bold');
          doc.text(`Purchase Price: $${pipe.purchase_price || 'N/A'} | Current Value: $${pipe.estimated_value || 'N/A'}`, 25, y);
          doc.setFont(undefined, 'normal');
          y += 5;
        }
        
        if (pipe.stamping) {
          doc.text(`Stamping: ${pipe.stamping}`, 25, y);
          y += 5;
        }
        
        if (pipe.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${pipe.notes}`, pageWidth - 50);
          doc.text(notesLines, 25, y);
          y += notesLines.length * 5;
        }
        
        if (pipe.photos && pipe.photos.length > 0) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`Photo URL: ${pipe.photos[0]}`, 25, y);
          doc.setTextColor(0);
          doc.setFontSize(9);
          y += 4;
        }
        
        y += 6;
      }
      
      doc.save(`pipe-insurance-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
        disabled={loading || pipes.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportInsurancePDF}
        disabled={loading || pipes.length === 0}
        className="text-blue-600 border-blue-300 hover:bg-blue-50"
      >
        <Shield className="w-4 h-4 mr-2" />
        Insurance Report
      </Button>
    </div>
  );
}