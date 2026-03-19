import React from 'react';

export default function PipeIcon({
  className = 'w-4 h-4',
  color = 'currentColor',
  title = 'Pipe',
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label={title}
      role="img"
      fill="none"
    >
      <path
        d="M4 13.5c0-2.2 1.8-4 4-4h3.8c1.2 0 2.2 1 2.2 2.2v.8c0 1.7 1.4 3 3 3H20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 7.5h3.6c1.8 0 3.2 1.4 3.2 3.2v1.1H6.2c-1.8 0-3.2-1.4-3.2-3.2S4.4 7.5 6.2 7.5Z"
        fill={color}
        opacity="0.22"
      />
      <path
        d="M6.2 7.5h3.6c1.8 0 3.2 1.4 3.2 3.2v1.1H6.2c-1.8 0-3.2-1.4-3.2-3.2S4.4 7.5 6.2 7.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.7 15.5h1.8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
