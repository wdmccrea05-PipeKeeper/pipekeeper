import React from 'react';
import { User } from 'lucide-react';

export default function CuratorIcon({ className = '', color = '#D47C7C' }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ position: 'relative' }}>
      {/* White circle background */}
      <div 
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: '100%',
          height: '100%',
          background: '#F5F1E7',
          color: color,
        }}
      >
        <User className="w-1/2 h-1/2" strokeWidth={2.5} />
      </div>
    </div>
  );
}