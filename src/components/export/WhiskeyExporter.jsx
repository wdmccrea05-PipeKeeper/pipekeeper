import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { toast } from 'sonner';
import { getBottleUnitValue, getBottleDisplayValueLabel } from '@/components/utils/whiskeyValueHelpers';

export default function WhiskeyExporter() {
  const [loading, setLoading] = useState(false);
  const { user } = useCurrentUser();

  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles-export', user?.email],
    queryFn: () => base44.entities.Bottle.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs-export', user?.email],
    queryFn: () => base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date'),
    enabled: !!user?.email,
  });

  const exportBottlesCSV = () => {
    const headers = [
      'Name', 'Distillery', 'Type', 'Region', 'Country',
      'Age (Years)', 'ABV (%)', 'Bottle Size',
      'Purchase Price', 'Purchase Location', 'Purchase Date',
      'Fill Level', 'Opened Date', 'Bottle Count',
      'Rating', 'Favorite', 'Notes'
    ];

    const rows = bottles.map(b => [
      b.name || '',
      b.distillery || '',
      b.type || '',
      b.region || '',
      b.country || '',
      b.age || '',
      b.abv || '',
      b.bottle_size || '',
      b.purchase_price || '',
      b.purchase_location || '',
      b.purchase_date || '',
      b.fill_level || '',
      b.opened_date || '',
      b.bottle_count || 1,
      b.rating || '',
      b.favorite ? 'Yes' : 'No',
      b.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiskey-collection-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportTastingNotesCSV = () => {
    const headers = [
      'Bottle Name', 'Tasting Date', 'Rating',
      'Nose Notes', 'Palate Notes', 'Finish Notes',
      'Overall Notes', 'Would Buy Again'
    ];

    const rows = tastingLogs.map(t => [
      t.bottle_name || '',
      t.tasting_date || '',
      t.rating || '',
      t.nose_notes || '',
      t.palate_notes || '',
      t.finish_notes || '',
      t.notes || '',
      t.would_buy_again ? 'Yes' : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiskey-tasting-notes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportCollectionPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Title
      doc.setFontSize(20);
      doc.text('Whiskey Collection Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Owner: ${user?.full_name || user?.email || ''}`, pageWidth / 2, 34, { align: 'center' });

      // Summary stats
      const totalValue = bottles.reduce((sum, b) => sum + getBottleUnitValue(b), 0);
      const totalBottles = bottles.reduce((sum, b) => sum + (Number(b.bottle_count) || 1), 0);
      const unopened = bottles.filter(b => !b.opened_date).length;
      const avgRating = bottles.filter(b => b.rating).reduce((s, b, _, a) => s + b.rating / a.length, 0);

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Collection Summary', 20, 45);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Total Bottles: ${totalBottles}`, 20, 52);
      doc.text(`Unopened: ${unopened}`, 20, 58);
      doc.text(`Total Purchase Value: $${totalValue.toLocaleString()}`, 20, 64);
      if (avgRating) doc.text(`Average Rating: ${avgRating.toFixed(1)} / 5`, 20, 70);

      // Bottle details
      let y = 85;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Bottle Details', 20, y);
      y += 8;

      doc.setFontSize(9);

      for (const [idx, bottle] of bottles.entries()) {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(`${idx + 1}. ${bottle.name || 'Unnamed'}`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        y += 6;

        if (bottle.distillery) {
          doc.text(`Distillery: ${bottle.distillery}${bottle.region ? ` | Region: ${bottle.region}` : ''}`, 25, y);
          y += 5;
        }

        const typeAge = [bottle.type, bottle.age ? `${bottle.age} yr` : null, bottle.abv ? `${bottle.abv}% ABV` : null].filter(Boolean).join(' | ');
        if (typeAge) {
          doc.text(typeAge, 25, y);
          y += 5;
        }

        const bottleValue = getBottleUnitValue(bottle);
        const bottleValueLabel = getBottleDisplayValueLabel(bottle);

        if (bottleValue) {
          doc.setFont(undefined, 'bold');
          doc.text(`${bottleValueLabel}: $${bottleValue}${bottle.fill_level ? ` | Fill: ${bottle.fill_level}` : ''}`, 25, y);
          doc.setFont(undefined, 'normal');
          y += 5;
        }

        if (bottle.rating) {
          doc.text(`Rating: ${'★'.repeat(bottle.rating)}${'☆'.repeat(5 - bottle.rating)} (${bottle.rating}/5)`, 25, y);
          y += 5;
        }

        if (bottle.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${bottle.notes}`, pageWidth - 50);
          if (y + notesLines.length * 5 > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(notesLines, 25, y);
          y += notesLines.length * 5;
        }

        y += 6;
      }

      // Tasting notes summary
      if (tastingLogs.length > 0) {
        doc.addPage();
        let ty = 20;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Recent Tasting Notes', 20, ty);
        ty += 10;

        doc.setFontSize(9);
        for (const [idx, log] of tastingLogs.slice(0, 20).entries()) {
          if (ty > pageHeight - 30) {
            doc.addPage();
            ty = 20;
          }

          doc.setFont(undefined, 'bold');
          doc.setFontSize(10);
          doc.text(`${log.bottle_name || 'Unnamed'} — ${log.tasting_date ? new Date(log.tasting_date).toLocaleDateString() : ''}`, 20, ty);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          ty += 6;

          if (log.notes) {
            const lines = doc.splitTextToSize(log.notes, pageWidth - 45);
            doc.text(lines, 25, ty);
            ty += lines.length * 5;
          }

          ty += 4;
        }
      }

      doc.save(`whiskey-collection-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('WhiskeyExporter PDF error:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={exportBottlesCSV}
        disabled={bottles.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export Bottles CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportTastingNotesCSV}
        disabled={tastingLogs.length === 0}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export Tasting Notes
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportCollectionPDF}
        disabled={loading || bottles.length === 0}
      >
        <FileText className="w-4 h-4 mr-2" />
        {loading ? 'Generating...' : 'Collection PDF'}
      </Button>
    </div>
  );
}