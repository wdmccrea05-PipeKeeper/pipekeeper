import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ModuleNav({ items, currentPath }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
      style={{
        borderBottom: '1px solid rgba(180, 140, 75, 0.2)',
        paddingBottom: '0.5rem',
      }}
    >
      {items.map((item) => {
        const isActive = currentPath === item.path;
        const Icon = item.icon;
        const iconUrl = item.iconImage || (typeof item.icon === 'string' ? item.icon : null);
        const isImageIcon = !!iconUrl;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0',
              isActive
                ? 'bg-[rgba(180,140,75,0.15)] text-[#D4A574] border border-[rgba(180,140,75,0.3)]'
                : 'text-[#E0D8C8]/70 hover:text-[#E0D8C8] hover:bg-[rgba(180,140,75,0.08)]'
            )}
            style={isActive ? { boxShadow: '0 2px 4px rgba(180,140,75,0.15), inset 0 1px 0 rgba(180,140,100,0.1)' } : {}}
          >
            {isImageIcon ? (
              <img
                src={iconUrl}
                alt={item.name}
                className="w-4 h-4 object-contain bg-transparent"
                style={{
                  backgroundColor: 'transparent',
                  opacity: isActive ? 1 : 0.78,
                  filter: isActive
                    ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))'
                    : 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                }}
                draggable={false}
              />
            ) : Icon ? (
              <Icon className="w-4 h-4" />
            ) : null}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
