import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';

export default function ModuleQuickLaunch({ 
  moduleKey,
  onAdd,
  onSearch,
}) {
  if (!moduleKey) return null;

  const configs = {
    pipekeeper: {
      label: 'Add Pipe',
      searchLabel: 'Quick Search',
      defaultPage: 'Pipes',
    },
    whiskeykeeper: {
      label: 'Add Bottle',
      searchLabel: 'Quick Search',
      defaultPage: 'Whiskey',
    },
  };

  const config = configs[moduleKey];
  if (!config) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {onAdd && (
        <Button
          onClick={onAdd}
          size="sm"
          className="gap-1"
          style={{
            background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))',
            color: '#F5F1E7',
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{config.label}</span>
        </Button>
      )}
      {onSearch && (
        <Button
          onClick={onSearch}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">{config.searchLabel}</span>
        </Button>
      )}
    </div>
  );
}