/**
 * WineVarietalSelect.jsx
 *
 * Searchable multi-select combobox for WineKeeper varietal fields.
 *
 * Features:
 *  - Type to filter grouped varietal options
 *  - Arrow keys + Enter for keyboard navigation
 *  - Chip display for selected varietals
 *  - Custom varietal entry (type text not in list → add with Enter or button)
 *  - Mobile-friendly: tap chip × to remove, large touch targets in dropdown
 *  - Backward compatible: accepts existing wines with legacy single string
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { VARIETAL_GROUPS, normalizeVarietalName } from '@/lib/wine/wineTaxonomy';
import { useTranslation } from '@/components/i18n/safeTranslation';

const DROPDOWN_STYLE = {
  background: 'rgba(20,14,10,0.97)',
  border: '1px solid rgba(180,140,75,0.3)',
  color: '#F5F1E7',
};

const INPUT_STYLE = {
  background: 'rgba(20,14,10,0.70)',
  border: '1px solid rgba(180,140,75,0.25)',
  color: '#F5F1E7',
};

const CHIP_STYLE = {
  background: 'rgba(139,58,58,0.25)',
  border: '1px solid rgba(139,58,58,0.5)',
  color: '#F5F1E7',
};

/**
 * @param {object}     props
 * @param {string[]}   props.selected     — array of currently selected varietals
 * @param {function}   props.onChange     — called with new string[] when selection changes
 * @param {string}     [props.placeholder]
 */
export default function WineVarietalSelect({
  selected = [],
  onChange,
  placeholder = 'Search or type a varietal…',
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Filtered + grouped options based on query
  const filteredGroups = useMemo(() => {
    const q = normalizeVarietalName(query);
    if (!q) return VARIETAL_GROUPS;
    return VARIETAL_GROUPS
      .map((g) => ({
        ...g,
        options: g.options.filter((o) => normalizeVarietalName(o).includes(q)),
      }))
      .filter((g) => g.options.length > 0);
  }, [query]);

  // Flat list of visible options for keyboard navigation
  const flatOptions = useMemo(() => filteredGroups.flatMap((g) => g.options), [filteredGroups]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFocusedIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addVarietal = useCallback(
    (v) => {
      const trimmed = v.trim();
      if (!trimmed) return;
      if (selected.map(normalizeVarietalName).includes(normalizeVarietalName(trimmed))) return;
      onChange([...selected, trimmed]);
      setQuery('');
      setFocusedIdx(-1);
      inputRef.current?.focus();
    },
    [selected, onChange],
  );

  const removeVarietal = useCallback(
    (v) => {
      onChange(selected.filter((s) => s !== v));
    },
    [selected, onChange],
  );

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      setFocusedIdx(0);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, flatOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIdx >= 0 && flatOptions[focusedIdx]) {
        addVarietal(flatOptions[focusedIdx]);
      } else if (query.trim()) {
        // Custom entry
        addVarietal(query.trim());
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIdx(-1);
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      // Remove last chip on backspace when input is empty
      removeVarietal(selected[selected.length - 1]);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx >= 0 && listRef.current) {
      const item = listRef.current.querySelectorAll('[data-option]')[focusedIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  const showAddCustom = query.trim() && !flatOptions.map(normalizeVarietalName).includes(normalizeVarietalName(query));

  return (
    <div ref={containerRef} className="relative">
      {/* Chip + input row */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[44px] w-full rounded-xl px-3 py-2 cursor-text"
        style={INPUT_STYLE}
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
            style={CHIP_STYLE}
          >
            {v}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeVarietal(v); }}
              className="hover:opacity-70 transition-opacity ml-0.5"
              aria-label={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusedIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : 'Add more…'}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          style={{ color: '#F5F1E7' }}
          aria-autocomplete="list"
          aria-controls="varietal-listbox"
          aria-label={t("auto.components_wine_WineVarietalSelect.varietal_search_jn4p77")}
          autoComplete="off"
        />
        <ChevronDown
          className="w-4 h-4 shrink-0 self-center"
          style={{ color: 'rgba(224,216,200,0.4)' }}
          onClick={() => setOpen((o) => !o)}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          id="varietal-listbox"
          role="listbox"
          ref={listRef}
          className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl overflow-y-auto"
          style={{ ...DROPDOWN_STYLE, maxHeight: '320px' }}
          aria-multiselectable="true"
        >
          {/* Custom add button */}
          {showAddCustom && (
            <button
              type="button"
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
              style={{ color: '#D4A574', borderBottom: '1px solid rgba(180,140,75,0.15)' }}
              onMouseDown={(e) => { e.preventDefault(); addVarietal(query.trim()); setOpen(false); }}
              data-option
            >
              <Plus className="w-3.5 h-3.5" />
              {t("auto.components_wine_WineVarietalSelect.add_3jz3oq")}{query.trim()}&rdquo;
            </button>
          )}

          {filteredGroups.length === 0 && !showAddCustom && (
            <div className="px-4 py-3 text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>
              {t("auto.components_wine_WineVarietalSelect.no_varietals_found_type_to_add_85ugdd")}
            </div>
          )}

          {filteredGroups.map((group) => (
            <div key={group.group}>
              <div
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(180,140,75,0.7)', background: 'rgba(255,255,255,0.03)' }}
              >
                {group.group}
              </div>
              {group.options.map((opt) => {
                const globalIdx = flatOptions.indexOf(opt);
                const isFocused = globalIdx === focusedIdx;
                const isSelected = selected.map(normalizeVarietalName).includes(normalizeVarietalName(opt));
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option
                    className="flex items-center justify-between w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      background: isFocused ? 'rgba(139,58,58,0.25)' : isSelected ? 'rgba(139,58,58,0.12)' : 'transparent',
                      color: isSelected ? '#C47070' : '#F5F1E7',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (isSelected) {
                        removeVarietal(selected.find((s) => normalizeVarietalName(s) === normalizeVarietalName(opt)));
                      } else {
                        addVarietal(opt);
                      }
                    }}
                    onMouseEnter={() => setFocusedIdx(globalIdx)}
                  >
                    <span>{opt}</span>
                    {isSelected && <span className="text-xs ml-2" style={{ color: '#C47070' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
