import React from 'react';

export default function WhiskeyBottleIcon({
  className = 'w-5 h-5',
  color = 'currentColor',
  title = 'Bottle',
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={title} fill="none">
      <path
        d="M9 2h6v2h-6V2Z"
        fill={color}
        opacity="0.22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 4h6v1.5c0 .828.672 1.5 1.5 1.5h0c.828 0 1.5.672 1.5 1.5v12c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V8.5c0-.828.672-1.5 1.5-1.5h0c.828 0 1.5-.672 1.5-1.5V4Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 8h4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill={color} opacity="0.4" />
    </svg>
  );
}