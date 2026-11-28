import React, { useState } from 'react';
import PipeIcon from '@/components/icons/PipeIcon';
import { Target } from 'lucide-react';

/**
 * ModuleQuickLaunch — renders an array of quick-action buttons.
 * Each action: { key, label, Icon?, usePipeIcon?, onClick }
 */
export default function ModuleQuickLaunch({ actions = [] }) {
  const [failedImages, setFailedImages] = useState({});
  if (!actions.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((action) => {
        const Icon = action.Icon;
        return (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className="group rounded-xl p-4 flex flex-col items-start gap-3 transition-all hover:translate-y-[-2px]"
            style={{
              background: '#fbf5e9',
              border: '1px solid rgba(167,124,63,0.28)',
              boxShadow: '0 4px 12px rgba(52,37,29,0.08)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(167,124,63,0.12)',
                border: '1px solid rgba(167,124,63,0.28)',
              }}
            >
              {action.usePipeIcon ? (
                <PipeIcon className="w-6 h-6" style={{ color: 'var(--ck-antique-brass)' }} />
              ) : action.iconImage && !failedImages[action.key] ? (
                <img
                  src={action.iconImage}
                  alt=""
                  aria-hidden="true"
                  className="w-6 h-6 object-contain rounded-md"
                  draggable={false}
                  onError={() => setFailedImages((current) => ({ ...current, [action.key]: true }))}
                />
              ) : Icon ? (
                <Icon className="w-5 h-5" style={{ color: 'var(--ck-antique-brass)' }} />
              ) : action.iconImage ? (
                <Target className="w-5 h-5" style={{ color: 'var(--ck-antique-brass)' }} />
              ) : null}
            </div>
            <span className="text-sm font-semibold text-left leading-tight" style={{ color: 'var(--ck-espresso)' }}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}