import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';

export default function TobaccoExporter() {
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

  const exportToCSV = () => {
    const headers = [
      'Name', 'Manufacturer', 'Blend Type', 'Cut', 'Strength', 'Quantity (tins)', 
      'Tin Size (oz)', 'Total Weight (oz)', 'Cellared Date', 'Cellared Amount (oz)',
      'Production Status', 'Aging Potential', 'Rating', 'Notes'
    ];

    const rows = blends.map(b => [
      b.name || '',
      b.manufacturer || '',
      b.blend_type || '',
      b.cut || '',
      b.strength || '',
      b.quantity_owned || 0,
      b.tin_size_oz || 0,
      (b.quantity_owned || 0) * (b.tin_size_oz || 0),
      b.cellared_date || '',
      b.cellared_amount || 0,
      b.production_status || '',
      b.aging_potential || '',
      b.rating || '',
      b.notes || ''
    ]);

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
      doc.text('Tobacco Collection Summary', pageWidth / 2, 20, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
      // Stats
      doc.setFontSize(12);
      const totalBlends = blends.length;
      const totalTins = blends.reduce((sum, b) => sum + (b.quantity_owned || 0), 0);
      const totalWeight = blends.reduce((sum, b) => sum + (b.quantity_owned || 0) * (b.tin_size_oz || 0), 0);
      
      doc.text(`Total Blends: ${totalBlends}`, 20, 40);
      doc.text(`Total Tins: ${totalTins}`, 20, 48);
      doc.text(`Total Weight: ${totalWeight.toFixed(2)} oz`, 20, 56);
      
      // Blends list
      let y = 70;
      doc.setFontSize(14);
      doc.text('Blend Details:', 20, y);
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
          doc.text(`Manufacturer: ${blend.manufacturer}`, 25, y);
          y += 5;
        }
        
        if (blend.blend_type) {
          doc.text(`Type: ${blend.blend_type} | Cut: ${blend.cut || 'N/A'} | Strength: ${blend.strength || 'N/A'}`, 25, y);
          y += 5;
        }
        
        if (blend.quantity_owned > 0) {
          const weight = (blend.quantity_owned * (blend.tin_size_oz || 0)).toFixed(2);
          doc.text(`Inventory: ${blend.quantity_owned} tin(s) (${weight} oz total)`, 25, y);
          y += 5;
        }
        
        if (blend.rating) {
          doc.text(`Rating: ${'★'.repeat(blend.rating)}${'☆'.repeat(5 - blend.rating)}`, 25, y);
          y += 5;
        }
        
        if (blend.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${blend.notes}`, pageWidth - 50);
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
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        disabled={loading || blends.length === 0}
      >
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}