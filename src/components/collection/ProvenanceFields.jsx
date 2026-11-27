import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DOCUMENTATION_FIELDS,
  LIFECYCLE_OPTIONS,
  normaliseTags,
} from '@/lib/collection/itemRecord';

/**
 * Editor for the documentation fields shared by every collection module.
 * Purely controlled: the parent owns the draft and decides when to save.
 */
export default function ProvenanceFields({ draft, onChange, disabled = false }) {
  const setField = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {DOCUMENTATION_FIELDS.map((field) => {
        const value = draft?.[field.key] ?? '';
        const isWide = field.type === 'textarea' || field.type === 'tags';

        return (
          <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(224,216,200,0.8)' }}>
              {field.label}
            </label>

            {field.type === 'textarea' && (
              <Textarea
                value={value}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={disabled}
                rows={3}
                placeholder={field.placeholder || ''}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            )}

            {field.type === 'select' && (
              <select
                value={value || 'active'}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={disabled}
                className="w-full rounded-lg px-3 py-2.5 text-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                style={{ minHeight: '2.65rem' }}
              >
                {LIFECYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} style={{ background: '#241913' }}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'tags' && (
              <>
                <Input
                  value={Array.isArray(value) ? value.join(', ') : value}
                  onChange={(e) => setField(field.key, normaliseTags(e.target.value))}
                  disabled={disabled}
                  placeholder="Comma separated, e.g. estate, unsmoked, inherited"
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
                />
                {Array.isArray(value) && value.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {value.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,165,116,0.15)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.3)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {(field.type === 'text' || field.type === 'date' || field.type === 'number') && (
              <Input
                type={field.type}
                value={value}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={disabled}
                placeholder={field.placeholder || ''}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(180,140,75,0.2)] text-[#F5F1E7]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}