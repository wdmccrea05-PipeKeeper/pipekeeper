import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

async function enrichPipe(record) {
  const missingFields = [];
  if (!record.country_of_origin) missingFields.push('country_of_origin');
  if (!record.shape) missingFields.push('shape');
  if (!record.bowl_material) missingFields.push('bowl_material');
  if (!record.finish) missingFields.push('finish');
  if (!record.year_made) missingFields.push('year_made');
  if (!record.condition) missingFields.push('condition');

  if (missingFields.length === 0) return {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a pipe expert. Given this pipe record, fill in only the clearly identifiable missing fields.
Return null for any field you are not confident about.

Pipe: "${record.name}"${record.maker ? ` by ${record.maker}` : ''}${record.shape ? `, shape: ${record.shape}` : ''}

Missing fields to fill: ${missingFields.join(', ')}

Field guidelines:
- country_of_origin: country name (e.g. "England", "Denmark", "Italy", "United States")
- shape: canonical pipe shape (e.g. "Billiard", "Bent Billiard", "Dublin", "Rhodesian", "Churchwarden")
- bowl_material: "Briar", "Meerschaum", "Corn Cob", "Clay", or other material
- finish: "Smooth", "Sandblasted", "Rusticated", "Carved", or other finish
- year_made: 4-digit year as a string, or null if unknown
- condition: one of "Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"`,
    response_json_schema: {
      type: 'object',
      properties: {
        country_of_origin: { type: ['string', 'null'] },
        shape: { type: ['string', 'null'] },
        bowl_material: { type: ['string', 'null'] },
        finish: { type: ['string', 'null'] },
        year_made: { type: ['string', 'null'] },
        condition: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};
  for (const field of missingFields) {
    if (result?.[field]) updates[field] = result[field];
  }
  return updates;
}

async function enrichBottle(record) {
  const missingFields = [];
  if (!record.distillery) missingFields.push('distillery');
  if (!record.region) missingFields.push('region');
  if (!record.type) missingFields.push('type');
  if (!record.age) missingFields.push('age');
  if (!record.abv) missingFields.push('abv');
  if (!record.country) missingFields.push('country');

  if (missingFields.length === 0) return {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a whiskey expert. Given this bottle record, fill in only the clearly identifiable missing fields.
Return null for any field you are not confident about.

Bottle: "${record.name}"${record.distillery ? ` by ${record.distillery}` : ''}${record.region ? ` (${record.region})` : ''}

Missing fields to fill: ${missingFields.join(', ')}

Field guidelines:
- distillery: the distillery or producer name
- region: whiskey region (e.g. "Speyside", "Islay", "Highland", "Kentucky", "Tennessee")
- type: one of "Single Malt", "Blended Malt", "Bourbon", "Rye", "Irish Whiskey", "Blended Whiskey", "Tennessee Whiskey"
- age: numeric age in years (number), or null if NAS
- abv: alcohol by volume as a number (e.g. 46.0), or null if unknown
- country: country of origin (e.g. "Scotland", "United States", "Ireland", "Japan")`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        distillery: { type: ['string', 'null'] },
        region: { type: ['string', 'null'] },
        type: { type: ['string', 'null'] },
        age: { type: ['number', 'null'] },
        abv: { type: ['number', 'null'] },
        country: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};
  for (const field of missingFields) {
    if (result?.[field] !== null && result?.[field] !== undefined) {
      updates[field] = result[field];
    }
  }
  return updates;
}

async function enrichCigar(record) {
  const missingFields = [];
  if (!record.country_of_origin) missingFields.push('country_of_origin');
  if (!record.wrapper) missingFields.push('wrapper');
  if (!record.binder) missingFields.push('binder');
  if (!record.filler) missingFields.push('filler');
  if (!record.strength) missingFields.push('strength');
  if (!record.body) missingFields.push('body');

  // Also compute production_status locally from quantity
  const localUpdates = {};
  if (!record.production_status) {
    const quantity = record.singles_equivalent || record.quantity || 0;
    if (quantity > 0) localUpdates.production_status = 'Active';
  }

  if (missingFields.length === 0) return localUpdates;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a cigar expert. Given this cigar record, fill in only the clearly identifiable missing fields.
Return null for any field you are not confident about.

Cigar: "${record.name}"${record.brand ? ` by ${record.brand}` : ''}${record.line ? `, line: ${record.line}` : ''}${record.vitola ? `, vitola: ${record.vitola}` : ''}

Missing fields to fill: ${missingFields.join(', ')}

Field guidelines:
- country_of_origin: country name (e.g. "Nicaragua", "Dominican Republic", "Honduras", "Cuba", "Ecuador")
- wrapper: wrapper leaf origin/type (e.g. "Ecuador Connecticut", "Nicaraguan Habano", "Cameroon", "Maduro")
- binder: binder leaf origin/type
- filler: filler leaf blend description
- strength: one of "mild", "medium", "full"
- body: one of "mild", "mild_medium", "medium", "medium_full", "full"`,
    response_json_schema: {
      type: 'object',
      properties: {
        country_of_origin: { type: ['string', 'null'] },
        wrapper: { type: ['string', 'null'] },
        binder: { type: ['string', 'null'] },
        filler: { type: ['string', 'null'] },
        strength: { type: ['string', 'null'] },
        body: { type: ['string', 'null'] },
      },
    },
  });

  const updates = { ...localUpdates };
  for (const field of missingFields) {
    if (result?.[field]) updates[field] = result[field];
  }
  return updates;
}

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
        const updates = await enrichPipe(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Pipe.update(record.id, updates);
          toast.success(`Pipe enriched — ${Object.keys(updates).length} field${Object.keys(updates).length !== 1 ? 's' : ''} updated`);
          onEnriched?.({ ...record, ...updates });
        } else {
          toast.info('No new metadata to add — pipe data is complete');
        }
      } else if (itemType === 'bottle') {
        const updates = await enrichBottle(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Bottle.update(record.id, updates);
          toast.success(`Bottle enriched — ${Object.keys(updates).length} field${Object.keys(updates).length !== 1 ? 's' : ''} updated`);
          onEnriched?.({ ...record, ...updates });
        } else {
          toast.info('No new metadata to add — bottle data is complete');
        }
      } else if (itemType === 'cigar') {
        const updates = await enrichCigar(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Cigar.update(record.id, updates);
          toast.success(`Cigar enriched — ${Object.keys(updates).length} field${Object.keys(updates).length !== 1 ? 's' : ''} updated`);
          onEnriched?.({ ...record, ...updates });
        } else {
          toast.info('No new metadata to add — cigar data is complete');
        }
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