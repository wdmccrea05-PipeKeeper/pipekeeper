import React from 'react';

const PIPE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/70ea43f6e_360_F_1826176062_5qMqZUKj6dcmLEArlJYU714IcDEutPcW.jpg';

export default function PipeShapeIcon({ shape, className = "w-16 h-16" }) {
  return (
    <img 
      src={PIPE_IMAGE} 
      alt={shape || "Pipe"} 
      className={`object-contain ${className}`}
      style={{ 
        filter: 'brightness(0) saturate(100%) invert(55%) sepia(26%) saturate(446%) hue-rotate(330deg) brightness(92%) contrast(87%)',
        opacity: 0.4
      }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = '🪈';
      }}
    />
  );
}