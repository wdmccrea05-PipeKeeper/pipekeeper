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
        const enriched = await base44.functions.invoke('enrichTobaccoBlend', {
          name: record.name,
          manufacturer: record.manufacturer,
          blend_type: record.blend_type,
          strength: record.strength,
          description: record.notes,
        });

        if (enriched) {
          const updateData = {};
          if (enriched.cut && !record.cut) updateData.cut = enriched.cut;
          if (enriched.rating && !record.rating) updateData.rating = enriched.rating;
          if (enriched.production_status && !record.production_status) updateData.production_status = enriched.production_status;
          if (enriched.aging_potential && !record.aging_potential) updateData.aging_potential = enriched.aging_potential;

          if (Object.keys(updateData).length > 0) {
            await base44.entities.TobaccoBlend.update(record.id, updateData);
            toast.success('Blend enriched with metadata');
            onEnriched?.({ ...record, ...updateData });
          } else {
            toast.info('No new metadata to add');
          }
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