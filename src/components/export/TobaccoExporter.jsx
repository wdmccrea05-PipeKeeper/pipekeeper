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
      'Name', 'Manufacturer', 'Blend Type', 'Cut', 'Strength', 'Room Note', 'Tobacco Components',
      'Flavor Notes', 'Production Status', 'Aging Potential', 'Rating', 'Is Favorite',
      'Total Tins', 'Tin Size (oz)', 'Tins Open', 'Tins Cellared', 'Tin Cellared Date', 'Tin Total Weight (oz)',
      'Total Bulk (oz)', 'Bulk Open (oz)', 'Bulk Cellared (oz)', 'Bulk Cellared Date',
      'Total Pouches', 'Pouch Size (oz)', 'Pouches Open', 'Pouches Cellared', 'Pouch Cellared Date', 'Pouch Total Weight (oz)',
      'Overall Total Weight (oz)', 'Overall Open Weight (oz)', 'Overall Cellared Weight (oz)',
      'Notes'
    ];

    const rows = blends.map(b => {
      const tinOpenOz = (b.tin_tins_open || 0) * (b.tin_size_oz || 0);
      const tinCellaredOz = (b.tin_tins_cellared || 0) * (b.tin_size_oz || 0);
      const pouchOpenOz = (b.pouch_pouches_open || 0) * (b.pouch_size_oz || 0);
      const pouchCellaredOz = (b.pouch_pouches_cellared || 0) * (b.pouch_size_oz || 0);
      const totalWeight = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);
      const totalOpen = tinOpenOz + (b.bulk_open || 0) + pouchOpenOz;
      const totalCellared = tinCellaredOz + (b.bulk_cellared || 0) + pouchCellaredOz;

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
      doc.text('Tobacco Collection Summary', pageWidth / 2, 20, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
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
      const totalCellaredOz = tinCellaredOz + bulkCellaredOz + pouchCellaredOz;
      
      let y = 40;
      doc.text(`Total Blends: ${totalBlends}`, 20, y);
      y += 6;
      doc.text(`Unique Brands: ${uniqueBrands}`, 20, y);
      y += 6;
      doc.text(`Favorites: ${favoriteBlends}`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text('Tin Inventory:', 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  Total Tins: ${totalTins} (${tinWeightOz.toFixed(1)} oz)`, 20, y);
      y += 6;
      doc.text(`  Open: ${tinOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Cellared: ${tinCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text('Bulk Inventory:', 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  Total: ${bulkWeightOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Open: ${bulkOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Cellared: ${bulkCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text('Pouch Inventory:', 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  Total Pouches: ${totalPouches} (${pouchWeightOz.toFixed(1)} oz)`, 20, y);
      y += 6;
      doc.text(`  Open: ${pouchOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Cellared: ${pouchCellaredOz.toFixed(1)} oz`, 20, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text('Overall Totals:', 20, y);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`  Total Weight: ${totalWeight.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Total Open: ${totalOpenOz.toFixed(1)} oz`, 20, y);
      y += 6;
      doc.text(`  Total Cellared: ${totalCellaredOz.toFixed(1)} oz`, 20, y);
      
      // Blends list
      y += 10;
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
        
        const tinWeight = blend.tin_total_quantity_oz || 0;
        const bulkWeight = blend.bulk_total_quantity_oz || 0;
        const pouchWeight = blend.pouch_total_quantity_oz || 0;
        const totalBlendWeight = tinWeight + bulkWeight + pouchWeight;
        
        if (totalBlendWeight > 0) {
          if (tinWeight > 0) {
            doc.text(`Tins: ${blend.tin_total_tins || 0} (${tinWeight.toFixed(2)} oz) - ${blend.tin_tins_open || 0} open, ${blend.tin_tins_cellared || 0} cellared`, 25, y);
            y += 5;
          }
          if (bulkWeight > 0) {
            doc.text(`Bulk: ${bulkWeight.toFixed(2)} oz - ${(blend.bulk_open || 0).toFixed(2)} oz open, ${(blend.bulk_cellared || 0).toFixed(2)} oz cellared`, 25, y);
            y += 5;
          }
          if (pouchWeight > 0) {
            doc.text(`Pouches: ${blend.pouch_total_pouches || 0} (${pouchWeight.toFixed(2)} oz) - ${blend.pouch_pouches_open || 0} open, ${blend.pouch_pouches_cellared || 0} cellared`, 25, y);
            y += 5;
          }
          doc.text(`Total: ${totalBlendWeight.toFixed(2)} oz`, 25, y);
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