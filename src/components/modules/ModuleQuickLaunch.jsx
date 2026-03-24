import React from 'react';

/**
 * ModuleQuickLaunch — renders an array of quick-action buttons.
 * Each action: { key, label, Icon?, iconImage?, onClick }
 */
export default function ModuleQuickLaunch({ actions = [] }) {
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
              background: 'linear-gradient(145deg, rgba(40,28,18,0.95), rgba(27,19,13,0.98))',
              border: '1px solid rgba(180,140,75,0.22)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(180,140,75,0.14)', border: '1px solid rgba(180,140,75,0.28)' }}
            >
              {action.iconImage ? (
                <img
                  src={action.iconImage}
                  alt={action.label}
                  className="w-6 h-6 object-contain"
                  style={{ backgroundColor: 'transparent' }}
                  draggable={false}
                />
              ) : Icon ? (
                <Icon className="w-5 h-5" style={{ color: '#D4A574' }} />
              ) : null}
            </div>
            <span className="text-sm font-semibold text-left leading-tight" style={{ color: '#F5F1E7' }}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}