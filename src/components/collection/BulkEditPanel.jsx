import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LIFECYCLE_OPTIONS, normaliseTags } from '@/lib/collection/itemRecord';

const EDITABLE = [
  { key: 'purchase_source', label: 'Acquisition source', type: 'text' },
  { key: 'original_owner', label: 'Original owner', type: 'text' },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'condition_notes', label: 'Condition notes', type: 'textarea' },
  { key: 'provenance_notes', label: 'Provenance notes', type: 'textarea' },
  { key: 'lifecycle_status', label: 'Lifecycle status', type: 'select' },
];

/**
 * Apply one documentation change to several records at once.
 * Only fields the collector fills in are sent; everything else is left as-is.
 */
export default function BulkEditPanel({ selectedCount, onApply, busy }) {
  const [values, setValues] = useState({});

  const setField = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const buildPatch = () => {
    const patch = {};
    for (const field of EDITABLE) {
      const value = values[field.key];
      if (field.type === 'tags') {
        const tags = normaliseTags(value);
        if (tags.length > 0) patch.tags = tags;
        continue;
      }
      if (value === undefined || value === null || String(value).trim() === '') continue;
      patch[field.key] = value;
    }
    return patch;
  };

  const patch = buildPatch();
  const fieldCount = Object.keys(patch).length;

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'rgba(224,216,200,0.6)' }}>
        Only the fields you fill in are written. Blank fields are left exactly as they are.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EDITABLE.map((field) => (
          <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(224,216,200,0.8)' }}>
              {field.label}
            </label>
            {field.type === 'textarea' && (
              <Textarea
                rows={2}
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            )}
            {field.type === 'select' && (
              <select
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                style={{ minHeight: '2.65rem' }}
              >
                <option value="" style={{ background: '#241913' }}>Leave unchanged</option>
                {LIFECYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ background: '#241913' }}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {(field.type === 'text' || field.type === 'tags') && (
              <Input
                value={values[field.key] || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.type === 'tags' ? 'Comma separated' : ''}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => onApply(patch)} disabled={busy || selectedCount === 0 || fieldCount === 0}>
          {busy ? 'Applying…' : `Apply to ${selectedCount} record${selectedCount === 1 ? '' : 's'}`}
        </Button>
        <span className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
          {selectedCount === 0
            ? 'Select records above'
            : fieldCount === 0
              ? 'Fill at least one field'
              : `${fieldCount} field${fieldCount === 1 ? '' : 's'} will change`}
        </span>
      </div>
    </div>
  );
}