/**
 * WhiskeyKeeperIcon — canonical identity icon for WhiskeyKeeper.
 * Renders a whiskey bottle + rocks glass SVG.
 * Use this everywhere WhiskeyKeeper is represented in user-facing UI.
 * Do NOT use Wine or GlassWater for WhiskeyKeeper identity.
 */
import React from 'react';

export default function WhiskeyKeeperIcon({ className = '', color = 'currentColor', size = 16, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-label="WhiskeyKeeper"
    >
      {/* Whiskey bottle */}
      <path d="M8 2h3v3c0 .5.3 1 .7 1.3L13 7.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7.5l1.3-1.2c.4-.3.7-.8.7-1.3V2z" />
      <line x1="6" y1="11" x2="13" y2="11" />

      {/* Rocks glass */}
      <path d="M16 9h5l-1 9h-3l-1-9z" />
      <line x1="16.3" y1="13" x2="20.7" y2="13" />
    </svg>
  );
}