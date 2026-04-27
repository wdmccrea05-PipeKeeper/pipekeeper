/**
 * WineStyleSelect.jsx
 *
 * Grouped style selector for WineKeeper forms.
 * Renders native <select> with <optgroup> sections for accessibility and mobile support.
 * Includes a "Custom…" escape hatch for free-text entry.
 */
import React, { useState, useEffect } from 'react';
import { STYLE_GROUPS, getStyleDisplay } from '@/lib/wine/wineTaxonomy';
import { Input } from '@/components/ui/input';

const SELECT_STYLE = {
  background: 'rgba(20,14,10,0.70)',
  border: '1px solid rgba(180,140,75,0.25)',
  color: '#F5F1E7',
};

const CUSTOM_VALUE = '__custom__';

/**
 * @param {object}   props
 * @param {string}   props.value         — current style value (display string or key)
 * @param {function} props.onChange       — called with (displayString, styleKey)
 * @param {string}   [props.placeholder] — placeholder for custom entry input
 */
export default function WineStyleSelect({ value, onChange, placeholder = 'Enter custom style…' }) {
  // Determine whether the current value is a custom (unlisted) entry
  const knownStyles = STYLE_GROUPS.flatMap((g) => g.options.map((o) => o.toLowerCase()));
  const isCustom = value && !knownStyles.includes(value.toLowerCase().trim());

  const [showCustom, setShowCustom] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : '');
  const [selectValue, setSelectValue] = useState(isCustom ? CUSTOM_VALUE : (value || ''));

  // Sync external value changes (e.g. when editing existing wine)
  useEffect(() => {
    const known = STYLE_GROUPS.flatMap((g) => g.options.map((o) => o.toLowerCase()));
    const isExt = value && !known.includes(value.toLowerCase().trim());
    if (isExt) {
      setShowCustom(true);
      setCustomValue(value || '');
      setSelectValue(CUSTOM_VALUE);
    } else {
      setShowCustom(false);
      setCustomValue('');
      setSelectValue(value || '');
    }
  }, [value]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === CUSTOM_VALUE) {
      setShowCustom(true);
      setSelectValue(CUSTOM_VALUE);
      // Don't call onChange yet — wait for custom text input
    } else {
      setShowCustom(false);
      setCustomValue('');
      setSelectValue(val);
      onChange(val, val.toLowerCase().trim());
    }
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomValue(val);
    onChange(val, val.toLowerCase().trim());
  };

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={handleSelectChange}
        className="flex h-11 w-full rounded-xl px-4 text-base"
        style={SELECT_STYLE}
        aria-label="Wine style"
      >
        <option value="">— Select style —</option>
        {STYLE_GROUPS.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_VALUE}>Custom…</option>
      </select>

      {showCustom && (
        <Input
          value={customValue}
          onChange={handleCustomChange}
          placeholder={placeholder}
          aria-label="Custom style entry"
          style={{ color: '#F5F1E7' }}
        />
      )}

      {/* Show resolved display when a known style is selected */}
      {!showCustom && value && (
        <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>
          {getStyleDisplay(value)}
        </p>
      )}
    </div>
  );
}
