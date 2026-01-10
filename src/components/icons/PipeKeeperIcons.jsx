import React from "react";

function Svg({ children, className = "", viewBox = "0 0 24 24" }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * Pipe icon — matches the Home tile reference:
 * - rounded bowl with top opening
 * - classic curved stem
 * - clean outline silhouette
 */
export function PipeIcon({ className = "h-5 w-5", strokeWidth = 2.25 }) {
  return (
    <Svg className={className} viewBox="0 0 24 24">
      {/* Bowl */}
      <path
        d="M6.6 10.2c0-1.55 1.25-2.8 2.8-2.8h3.2c1.55 0 2.8 1.25 2.8 2.8v4.6c0 2.95-2.39 5.34-5.34 5.34S6.6 17.75 6.6 14.8v-4.6Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Bowl opening (top) */}
      <path
        d="M9 7.35c.25-.55.8-.9 1.42-.9h1.96c.62 0 1.17.35 1.42.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Stem / shank curve */}
      <path
        d="M16.9 11.4h1.7c2.15 0 3.4 1.25 3.4 2.85 0 1.55-1.2 2.8-2.95 2.8h-2.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bit */}
      <path
        d="M21.55 17.05H22.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Tobacco leaf icon — matches the Home "Blends" tile reference:
 * - simple outline
 * - single midrib vein
 * - gentle tilt/shape
 */
export function TobaccoLeafIcon({ className = "h-5 w-5", strokeWidth = 2.25 }) {
  return (
    <Svg className={className} viewBox="0 0 24 24">
      {/* Leaf outline */}
      <path
        d="M19.6 4.7c-6.3.4-11.1 3.6-13.4 8.1-1.2 2.4-1.3 5.7-1.3 5.7s3.3-.1 5.7-1.3c4.5-2.3 7.7-7.1 9-12.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Midrib */}
      <path
        d="M7 16.9c3.1-3 7.8-6.3 12-8.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}