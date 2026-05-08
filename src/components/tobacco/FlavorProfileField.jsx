import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cleanFlavorNote, hasFlavorNote, normalizeFlavorNotes, removeFlavorNote } from './flavorNotes';

export default function FlavorProfileField({
  value = [],
  onChange,
  commonNotes = [],
  getNoteLabel = (note) => note,
  description,
  placeholder = 'Add custom flavor note…',
  addLabel = 'Add',
  selectedLabel = 'Selected notes',
}) {
  const [inputValue, setInputValue] = useState('');
  const selectedNotes = useMemo(() => normalizeFlavorNotes(value), [value]);

  const addCustomNote = () => {
    const cleaned = cleanFlavorNote(inputValue);
    if (!cleaned) {
      setInputValue('');
      return;
    }

    if (hasFlavorNote(selectedNotes, cleaned)) {
      setInputValue('');
      return;
    }

    onChange([...selectedNotes, cleaned]);
    setInputValue('');
  };

  const toggleNote = (note) => {
    if (hasFlavorNote(selectedNotes, note)) {
      onChange(removeFlavorNote(selectedNotes, note));
      return;
    }

    onChange([...selectedNotes, note]);
  };

  const handleRemove = (note) => {
    onChange(removeFlavorNote(selectedNotes, note));
  };

  return (
    <div className="space-y-4 overflow-x-hidden" data-testid="flavor-profile-field">
      {description ? <p className="text-sm text-[#D7C9B2]/70">{description}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          aria-label={placeholder}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustomNote();
            }
          }}
          placeholder={placeholder}
          className="min-h-11 w-full min-w-0 border-[rgba(140,105,65,0.28)]"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addCustomNote}
          className="min-h-11 w-full shrink-0 sm:w-auto"
        >
          {addLabel}
        </Button>
      </div>

      {selectedNotes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D7C9B2]/70">{selectedLabel}</p>
          <div className="flex flex-wrap gap-2">
            {selectedNotes.map((note) => (
              <Badge
                key={note.toLowerCase()}
                variant="secondary"
                className="min-h-9 max-w-full gap-1 bg-amber-600 px-3 py-2 text-white border-amber-700"
              >
                <span className="break-words">{note}</span>
                <button
                  type="button"
                  aria-label={`Remove flavor note ${note}`}
                  onClick={() => handleRemove(note)}
                  className="rounded-full p-1 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {commonNotes.map((note) => {
          const active = hasFlavorNote(selectedNotes, note);
          return (
            <button
              key={note}
              type="button"
              onClick={() => toggleNote(note)}
              aria-label={`Toggle ${getNoteLabel(note)} flavor note`}
              className={`min-h-10 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-stone-100 text-[#6F5A45] border-[rgba(140,105,65,0.28)] hover:bg-stone-200'
              }`}
            >
              {getNoteLabel(note)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
