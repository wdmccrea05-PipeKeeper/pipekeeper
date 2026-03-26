import React, { useState } from 'react';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CONFIG = {
  pipe:   { nameLabel: 'Pipe Name', brandLabel: 'Maker / Brand', brandKey: 'maker',         entity: 'Pipe' },
  blend:  { nameLabel: 'Blend Name', brandLabel: 'Manufacturer',  brandKey: 'manufacturer',   entity: 'TobaccoBlend' },
  bottle: { nameLabel: 'Bottle Name', brandLabel: 'Distillery',   brandKey: 'distillery',     entity: 'Bottle' },
};

const TYPE_LABELS = { pipe: 'Pipe', blend: 'Tobacco Blend', bottle: 'Whiskey Bottle' };

export default function AddFlowQuickAdd({ itemType, onBack, onCreated }) {
  const cfg = CONFIG[itemType] || CONFIG.pipe;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSaving(true);
    try {
      const data = { name: name.trim() };
      if (brand.trim()) data[cfg.brandKey] = brand.trim();
      const record = await base44.entities[cfg.entity].create(data);
      toast.success(`${TYPE_LABELS[itemType]} added!`);
      onCreated(record);
    } catch (e) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(180,140,75,0.14)' }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors mr-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Quick Add {TYPE_LABELS[itemType]}
          </h2>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4 flex-1">
        <div className="space-y-1.5">
          <Label style={{ color: 'rgba(224,216,200,0.7)', fontSize: '0.75rem' }}>{cfg.nameLabel} *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter ${cfg.nameLabel.toLowerCase()}...`}
            className="bg-[rgba(20,15,12,0.6)] border-[rgba(180,140,75,0.28)] text-[#F5F1E7] placeholder:text-[#E0D8C8]/40"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label style={{ color: 'rgba(224,216,200,0.7)', fontSize: '0.75rem' }}>{cfg.brandLabel}</Label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={`Enter ${cfg.brandLabel.toLowerCase()}...`}
            className="bg-[rgba(20,15,12,0.6)] border-[rgba(180,140,75,0.28)] text-[#F5F1E7] placeholder:text-[#E0D8C8]/40"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onBack}
            disabled={saving}
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)' }}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}