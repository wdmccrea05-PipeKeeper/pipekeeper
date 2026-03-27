import React, { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BLEND_TYPES = ['Virginia', 'Virginia/Perique', 'Virginia/Burley', 'English', 'Balkan', 'Aromatic', 'Burley', 'Burley-based', 'Latakia Blend', 'Oriental/Turkish', 'American', 'Cavendish', 'Kentucky', 'Dark Fired Kentucky', 'Perique', 'Lakeland', 'Codger Blend', 'Other'];
const SHAPES = ['Billiard', 'Apple', 'Bent Billiard', 'Dublin', 'Bulldog', 'Rhodesian', 'Canadian', 'Lovat', 'Poker', 'Freehand', 'Churchwarden', 'Calabash', 'Volcano', 'Horn', 'Other', 'Unknown'];
const WHISKEY_TYPES = ['Single Malt Scotch', 'Blended Scotch', 'Bourbon', 'Rye', 'Irish', 'Japanese', 'Canadian', 'Tennessee', 'Single Grain', 'Other'];

const FIELDS = {
  blend: [
    { key: 'name', label: 'Blend Name', required: true, type: 'input' },
    { key: 'manufacturer', label: 'Manufacturer', required: false, type: 'input' },
    { key: 'blend_type', label: 'Blend Type', required: false, type: 'select', options: BLEND_TYPES },
  ],
  pipe: [
    { key: 'name', label: 'Model / Pipe Name', required: true, type: 'input' },
    { key: 'maker', label: 'Maker / Brand', required: false, type: 'input' },
    { key: 'shape', label: 'Shape', required: false, type: 'select', options: SHAPES },
  ],
  bottle: [
    { key: 'name', label: 'Bottle Name / Expression', required: true, type: 'input' },
    { key: 'distillery', label: 'Distillery / Brand', required: false, type: 'input' },
    { key: 'type', label: 'Category / Type', required: false, type: 'select', options: WHISKEY_TYPES },
  ],
};

const inputStyle = {
  background: 'rgba(20,13,8,0.7)',
  border: '1px solid rgba(180,140,75,0.28)',
  color: '#F5F1E7',
};

export default function AddFlowManualBasic({ itemType, typeLabel, onBack, onNext, data }) {
  const fields = FIELDS[itemType] || FIELDS.blend;
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = data?.[f.key] || ''; });
    return init;
  });

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleNext = () => {
    const required = fields.filter(f => f.required);
    for (const f of required) {
      if (!values[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    onNext(values);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Basic Info
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>Step 1 of 4</p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label style={{ color: 'rgba(224,216,200,0.65)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {f.label}{f.required && ' *'}
            </Label>
            {f.type === 'input' ? (
              <Input
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={`Enter ${f.label.toLowerCase()}…`}
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
                autoFocus={f.key === 'name'}
              />
            ) : (
              <Select value={values[f.key] || ''} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger style={{ ...inputStyle, height: 40 }}>
                  <SelectValue placeholder={`Select ${f.label.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        <Button
          onClick={handleNext}
          className="w-full mt-2"
          style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff', fontWeight: 600 }}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="pb-2" />
    </div>
  );
}