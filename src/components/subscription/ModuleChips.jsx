import React from 'react';

const moduleColors = {
  pipekeeper: { bg: '#8B5A2B', text: '#F5F1E7' },
  whiskeykeeper: { bg: '#B4824B', text: '#F5F1E7' },
  cigarkeeper: { bg: '#5A4A3A', text: '#F5F1E7' },
  winekeeper: { bg: '#8B3A3A', text: '#F5F1E7' },
};

const moduleLabels = {
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  winekeeper: 'WineKeeper',
};

export default function ModuleChips({ modules = [] }) {
  if (!modules || modules.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {modules.map((module) => (
        <div
          key={module}
          className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all"
          style={{
            backgroundColor: moduleColors[module]?.bg || '#5A4A3A',
            color: moduleColors[module]?.text || '#F5F1E7',
          }}
        >
          {moduleLabels[module] || module}
        </div>
      ))}
    </div>
  );
}