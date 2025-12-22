import React from 'react';

const PIPE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg';

export default function PipeShapeIcon({ shape, className = "w-16 h-16" }) {
  return (
    <img 
      src={PIPE_IMAGE} 
      alt={shape || "Pipe"} 
      className={`object-contain opacity-40 ${className}`}
      style={{ mixBlendMode: 'multiply', display: 'block' }}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = '🪈';
      }}
    />
  );
}