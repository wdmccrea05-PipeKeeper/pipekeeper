import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { currentSpecializations, specializationLabel } from '@/lib/collection/specialization';
import { TEXT_PRIMARY, TEXT_SECONDARY, TEXT_CAPTION } from '@/lib/theme/tokens';

const ROWS = [
  { key: 'maker', label: 'Maker' },
  { key: 'shape', label: 'Shape' },
  { key: 'bend', label: 'Bend' },
  { key: 'bowl_material', label: 'Bowl material' },
  { key: 'finish', label: 'Finish' },
  { key: 'stem_material', label: 'Stem material' },
  { key: 'bowl_depth_mm', label: 'Chamber depth', unit: 'mm' },
  { key: 'bowl_diameter_mm', label: 'Chamber diameter', unit: 'mm' },
  { key: 'chamber_volume', label: 'Chamber volume' },
  { key: 'weight_grams', label: 'Weight', unit: 'g' },
  { key: 'length_mm', label: 'Length', unit: 'mm' },
  { key: 'filter_type', label: 'Filter' },
  { key: 'condition', label: 'Condition' },
  { key: 'year_made', label: 'Year made' },
];

function cell(pipe, row) {
  const value = pipe?.[row.key];
  if (value === undefined || value === null || value === '') return '—';
  return row.unit ? `${value} ${row.unit}` : String(value);
}

/**
 * Side-by-side comparison of two pipes: recorded characteristics plus their
 * specializations. Read-only — it explains differences, it does not score them.
 */
export default function PipeCharacteristicsCompare({ pipes = [] }) {
  const options = useMemo(
    () => [...pipes].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [pipes],
  );
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  const left = options.find((pipe) => pipe.id === leftId) || null;
  const right = options.find((pipe) => pipe.id === rightId) || null;

  const selectStyle = {
    background: 'linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))',
    border: '1px solid rgba(140,105,65,0.4)',
    color: '#E0D8C8',
  };

  if (options.length < 2) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm" style={{ color: TEXT_CAPTION }}>
            Add at least two pipes to compare their characteristics side by side.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>Compare two pipes</h3>
          <p className="text-sm mt-1" style={{ color: TEXT_CAPTION }}>
            Recorded characteristics and specializations, side by side.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            aria-label="First pipe"
            value={leftId}
            onChange={(event) => setLeftId(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={selectStyle}
          >
            <option value="">Select a pipe</option>
            {options.map((pipe) => (
              <option key={pipe.id} value={pipe.id}>{pipe.name}</option>
            ))}
          </select>
          <select
            aria-label="Second pipe"
            value={rightId}
            onChange={(event) => setRightId(event.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={selectStyle}
          >
            <option value="">Select a pipe</option>
            {options.map((pipe) => (
              <option key={pipe.id} value={pipe.id}>{pipe.name}</option>
            ))}
          </select>
        </div>

        {left && right && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3" style={{ color: TEXT_CAPTION }}>Characteristic</th>
                  <th className="text-left py-2 pr-3 break-words" style={{ color: TEXT_PRIMARY }}>{left.name}</th>
                  <th className="text-left py-2 break-words" style={{ color: TEXT_PRIMARY }}>{right.name}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <td className="py-2 pr-3" style={{ color: TEXT_CAPTION }}>Specialization</td>
                  <td className="py-2 pr-3 break-words" style={{ color: TEXT_SECONDARY }}>
                    {currentSpecializations(left).map(specializationLabel).join(', ') || '—'}
                  </td>
                  <td className="py-2 break-words" style={{ color: TEXT_SECONDARY }}>
                    {currentSpecializations(right).map(specializationLabel).join(', ') || '—'}
                  </td>
                </tr>
                {ROWS.map((row) => (
                  <tr key={row.key} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <td className="py-2 pr-3" style={{ color: TEXT_CAPTION }}>{row.label}</td>
                    <td className="py-2 pr-3 break-words" style={{ color: TEXT_SECONDARY }}>{cell(left, row)}</td>
                    <td className="py-2 break-words" style={{ color: TEXT_SECONDARY }}>{cell(right, row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}