import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EnrichButton({ itemType, record, onEnriched }) {
  const [loading, setLoading] = useState(false);

  const handleEnrich = async () => {
    setLoading(true);
    try {
      if (itemType === 'blend') {
        const updateData = {};

        // 1. Get Cut from public enrichment data
        const enriched = await base44.functions.invoke('enrichTobaccoBlend', {
          name: record.name,
          manufacturer: record.manufacturer,
          blend_type: record.blend_type,
          strength: record.strength,
          description: record.notes,
        });
        if (enriched?.cut) updateData.cut = enriched.cut;
        if (enriched?.rating) updateData.rating = enriched.rating;

        // 2. Calculate Status from inventory
        const hasOpen = (record.tin_tins_open || 0) > 0 || (record.bulk_open || 0) > 0 || (record.pouch_pouches_open || 0) > 0;
        const hasCellared = (record.tin_tins_cellared || 0) > 0 || (record.bulk_cellared || 0) > 0 || (record.pouch_pouches_cellared || 0) > 0;
        if (hasOpen && hasCellared) updateData.production_status = 'Both';
        else if (hasCellared) updateData.production_status = 'Cellared';
        else if (hasOpen) updateData.production_status = 'Open';

        // 3. Determine Aging from cellar logs
        const cellarLogs = await base44.entities.CellarLog.filter({ blend_id: record.id }, '-date', 100).catch(() => []);
        const hasAgedItems = (cellarLogs || []).some(log => log.transaction_type === 'added' && log.date);
        if (hasAgedItems) updateData.aging_potential = 'Aging';

        if (Object.keys(updateData).length > 0) {
          await base44.entities.TobaccoBlend.update(record.id, updateData);
          toast.success('Blend enriched with metadata');
          onEnriched?.({ ...record, ...updateData });
        } else {
          toast.info('No new metadata to add');
        }
      } else if (itemType === 'pipe') {
        // Similar enrichment logic for pipes if needed
        toast.info('Enrichment not yet available for pipes');
      } else if (itemType === 'bottle') {
        // Similar enrichment logic for bottles if needed
        toast.info('Enrichment not yet available for bottles');
      }
    } catch (e) {
      toast.error(e?.message || 'Enrichment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEnrich}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
      Enrich
    </Button>
  );
}