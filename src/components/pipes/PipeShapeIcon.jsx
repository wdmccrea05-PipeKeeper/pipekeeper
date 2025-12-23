import React from 'react';

const PIPE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/dd0287dd6_pipe_no_bg.png';

export default function PipeShapeIcon({ shape, className = "w-16 h-16" }) {
  return (
    <img 
      src={PIPE_IMAGE} 
      alt={shape || "Pipe"} 
      className={`object-contain ${className}`}
      style={{ 
        filter: 'brightness(0) saturate(100%) invert(62%) sepia(16%) saturate(598%) hue-rotate(330deg) brightness(92%) contrast(88%)',
        opacity: 0.3
      }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = '🪈';
      }}
    />
  );
}