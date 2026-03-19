import React from 'react';

export default function RocksGlassIcon({
  className = 'w-5 h-5',
  color = 'currentColor',
  title = 'Glass',
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={title} fill="none">
      <path
        d="M6 3h12l-2 8v8c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-8l-2-8Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 7h6" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 11h7" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}