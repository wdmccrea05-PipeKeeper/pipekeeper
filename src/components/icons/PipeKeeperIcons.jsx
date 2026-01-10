import React from "react";

/**
 * PipeKeeper Icons — single source of truth
 * - Inline SVG
 * - Uses currentColor (themeable)
 * - Clear at 16–32px (nav + tiles)
 */

/** Classic Tobacco Pipe (bowl left, curved stem right) */
export function PipeIcon({ className = "h-5 w-5", strokeWidth = 2.25 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Bowl */}
      <path d="M6.4 10.4c0-1.7 1.35-3.05 3.05-3.05h3.15c1.7 0 3.05 1.35 3.05 3.05v4.1c0 3.05-2.47 5.52-5.52 5.52S6.4 17.6 6.4 14.55v-4.1Z" />
      {/* Bowl rim */}
      <path d="M8.9 7.35h4.2" />
      {/* Shank / stem */}
      <path d="M15.65 12.1h3.1c2.05 0 3.25 1.25 3.25 2.8 0 1.5-1.15 2.7-2.7 2.7h-3.65" />
      {/* Bit */}
      <path d="M21.7 17.55h.7" />
    </svg>
  );
}

/** Simple Tobacco Leaf (matches blends tile style) */
export function TobaccoLeafIcon({ className = "h-5 w-5", strokeWidth = 2.25 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Leaf outline */}
      <path d="M19.6 4.6C13.0 5.0 7.7 8.6 5.7 13.5c-1.1 2.7-1.1 5.9-1.1 5.9s3.2 0 5.9-1.1c4.9-2 8.5-7.3 9.1-13.7Z" />
      {/* Midrib */}
      <path d="M7.2 16.9c3.0-3.0 7.7-6.1 11.9-8.0" />
    </svg>
  );
}