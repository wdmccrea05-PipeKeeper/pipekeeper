import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import { useTranslation } from "@/components/i18n/safeTranslation";
import { fetchAllEntities } from "@/lib/base44/fetchAllEntities";

export default function PairingExporter({ pipes, blends }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pairingMatrix } = useQuery({
    queryKey: ['pairing-matrix', user?.email],
    queryFn: async () => {
      const results = await fetchAllEntities(base44.entities.PairingMatrix, { created_by: user?.email });
      return results[0];
    },
    enabled: !!user?.email,
  });

  const exportToCSV = () => {
    if (!pairingMatrix?.pairings) return;

    const headers = [
      t('pairingExporter.csvPipeName'), t('pairingExporter.csvPipeShape'),
      t('pairingExporter.csvBlendName'), t('pairingExporter.csvBlendType'),
      t('pairingExporter.csvMatchScore'), t('pairingExporter.csvReasoning'),
    ];
    
    const rows = [];
    pairingMatrix.pairings.forEach(pairing => {
      const pipe = pipes.find(p => p.id === pairing.pipe_id);
      pairing.top_blends?.forEach(match => {
        const blend = blends.find(b => b.id === match.blend_id);
        rows.push([
        pipe?.name || t('pairingExporter.unknownPipe'),
          pipe?.shape || '',
          blend?.name || t('pairingExporter.unknownBlend'),
          blend?.blend_type || '',
          match.match_score || '',
          match.reasoning || ''
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pairing-guide-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!pairingMatrix?.pairings) return;
    
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text(t("pairingExporter.title"), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`${t("pairingExporter.generated")} ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
      
      let y = 40;
      
      pairingMatrix.pairings.forEach((pairing, idx) => {
        const pipe = pipes.find(p => p.id === pairing.pipe_id);
        
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${pipe?.name || t('pairingExporter.unknownPipe')}`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        y += 6;
        
        if (pipe?.shape) {
          doc.text(`${t("pairingExporter.shape")} ${pipe.shape}`, 25, y);
          y += 5;
        }
        
        y += 2;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(t("pairingExporter.bestBlendMatches"), 25, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        y += 5;
        
        pairing.top_blends?.slice(0, 5).forEach((match, matchIdx) => {
          const blend = blends.find(b => b.id === match.blend_id);
          
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          doc.setFont(undefined, 'bold');
          doc.text(`${matchIdx + 1}. ${blend?.name || t('pairingExporter.unknownBlend')} (${match.match_score}/100)`, 30, y);
          doc.setFont(undefined, 'normal');
          y += 4;
          
          if (blend?.blend_type) {
            doc.text(`${t("pairingExporter.type")} ${blend.blend_type}`, 35, y);
            y += 4;
          }
          
          if (match.reasoning) {
            const reasoningLines = doc.splitTextToSize(match.reasoning, pageWidth - 75);
            doc.text(reasoningLines, 35, y);
            y += reasoningLines.length * 4 + 2;
          }
        });
        
        y += 6;
      });
      
      doc.save(`pairing-guide-${new Date().toISOString().split('T')[0]}.pdf`);
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
        disabled={loading || !pairingMatrix?.pairings}
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        {t("pairingExporter.exportCSV")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        disabled={loading || !pairingMatrix?.pairings}
      >
        <FileText className="w-4 h-4 mr-2" />
        {t("pairingExporter.exportPDF")}
      </Button>
    </div>
  );
}