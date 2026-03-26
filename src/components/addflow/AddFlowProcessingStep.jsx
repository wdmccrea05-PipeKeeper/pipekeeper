import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Tobacco Blend', bottle: 'Whiskey Bottle' };

function buildCreateData(itemType, item) {
  const base = { name: item.name };
  if (itemType === 'pipe') return { ...base, maker: item.brand, shape: item.shape, bowl_material: item.bowl_material, finish: item.finish };
  if (itemType === 'blend') return { ...base, manufacturer: item.brand, blend_type: item.blend_type, strength: item.strength, flavor_notes: item.flavor_notes };
  if (itemType === 'bottle') return { ...base, distillery: item.brand, type: item.whiskey_type, age: item.age || undefined, abv: item.abv || undefined, region: item.region };
  return base;
}

function cleanCreateData(data) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

const ENTITIES = { pipe: 'Pipe', blend: 'TobaccoBlend', bottle: 'Bottle' };

// Async enrichment: find an image and update the record
async function enrichWithImage(itemType, record, name, brand) {
  try {
    const res = await base44.functions.invoke('searchProductImages', {
      name: `${name} ${brand || ''}`.trim(),
      category: itemType,
    });
    const imageUrl = res?.data?.image_url || res?.data?.images?.[0];
    if (!imageUrl) return;

    const entityName = ENTITIES[itemType];
    if (itemType === 'pipe') {
      await base44.entities[entityName].update(record.id, { photos: [imageUrl] });
    } else if (itemType === 'blend') {
      await base44.entities[entityName].update(record.id, { logo: imageUrl });
    } else if (itemType === 'bottle') {
      await base44.entities[entityName].update(record.id, { photo: imageUrl });
    }
  } catch {
    // silent — enrichment is best-effort
  }
}

// Async enrichment: run classification for more data
async function enrichWithClassification(itemType, record, item) {
  if (itemType === 'blend' && !item.flavor_notes?.length) {
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `For tobacco blend "${item.name}" by ${item.brand || 'unknown maker'}, provide:
Return JSON: {"flavor_notes":["..."],"aging_potential":"Good","room_note":"Pleasant"}`,
        response_json_schema: {
          type: 'object',
          properties: {
            flavor_notes: { type: 'array', items: { type: 'string' } },
            aging_potential: { type: 'string' },
            room_note: { type: 'string' },
          }
        }
      });
      const updates = {};
      if (res?.flavor_notes?.length) updates.flavor_notes = res.flavor_notes;
      if (res?.aging_potential) updates.aging_potential = res.aging_potential;
      if (res?.room_note) updates.room_note = res.room_note;
      if (Object.keys(updates).length) {
        await base44.entities.TobaccoBlend.update(record.id, updates);
      }
    } catch { /* silent */ }
  }
}

export default function AddFlowProcessingStep({ itemType, item, onCreated }) {
  const ran = useRef(false);
  const [stages, setStages] = useState([
    { id: 'create',   label: 'Creating record',   status: 'running' },
    { id: 'image',    label: 'Finding image',      status: 'pending' },
    { id: 'classify', label: 'Enriching data',     status: 'pending' },
    { id: 'done',     label: 'Finalizing',         status: 'pending' },
  ]);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);

  const setStage = (id, status) =>
    setStages(prev => prev.map(s => s.id === id ? { ...s, status } : s));

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const entityName = ENTITIES[itemType];
      let created;

      // Stage 1: Create
      try {
        const data = cleanCreateData(buildCreateData(itemType, item));
        created = await base44.entities[entityName].create(data);
        setStage('create', 'done');
        setRecord(created);
      } catch (e) {
        setStage('create', 'failed');
        setError(e?.message || 'Failed to create record');
        return;
      }

      // Stage 2: Image (best-effort)
      setStage('image', 'running');
      await enrichWithImage(itemType, created, item.name, item.brand);
      setStage('image', 'done');

      // Stage 3: Classify (best-effort)
      setStage('classify', 'running');
      await enrichWithClassification(itemType, created, item);
      setStage('classify', 'done');

      // Stage 4: Finalize
      setStage('done', 'running');
      await new Promise(r => setTimeout(r, 400));
      setStage('done', 'done');

      toast.success(`${TYPE_LABELS[itemType]} added!`);
      setTimeout(() => onCreated(created), 500);
    })();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#D4A574' }} />;
    if (status === 'done') return <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(46,125,92,0.9)' }} />;
    if (status === 'failed') return <XCircle className="w-4 h-4" style={{ color: '#D45C5C' }} />;
    return <div className="w-4 h-4 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }} />;
  };

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-6" style={{ minHeight: 320 }}>
      <div className="text-center">
        <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          Adding {item?.name}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
          Just a moment…
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {stages.map(({ id, label, status }) => (
          <div
            key={id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
            style={{
              background: status === 'running'
                ? 'rgba(180,140,75,0.08)'
                : status === 'done'
                  ? 'rgba(46,125,92,0.06)'
                  : 'rgba(255,255,255,0.02)',
              border: `1px solid ${status === 'running' ? 'rgba(180,140,75,0.2)' : status === 'done' ? 'rgba(46,125,92,0.18)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <StatusIcon status={status} />
            <p
              className="text-sm flex-1 min-w-0"
              style={{
                color: status === 'done' ? 'rgba(100,200,140,0.8)' : status === 'running' ? '#F5F1E7' : 'rgba(224,216,200,0.4)',
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="w-full space-y-3">
          <p className="text-sm text-center" style={{ color: '#D45C5C' }}>{error}</p>
          <Button variant="outline" className="w-full" onClick={() => onCreated(null)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}