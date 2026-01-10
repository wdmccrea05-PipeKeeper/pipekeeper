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
 * Pipe icon — simplified classic pipe to match the Home "Pipes" tile style:
 * bowl on left, stem to right, clean silhouette outline.
 */
export function PipeIcon({ className = "h-5 w-5", strokeWidth = 2.2 }) {
  return (
    <Svg className={className} viewBox="0 0 24 24">
      {/* Bowl */}
      <path
        d="M6.25 10.25c0-1.8 1.45-3.25 3.25-3.25h2.8c1.8 0 3.25 1.45 3.25 3.25v4.2c0 2.8-2.27 5.05-5.05 5.05S6.25 17.25 6.25 14.45v-4.2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Rim */}
      <path
        d="M8.2 7h5.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Shank + Stem */}
      <path
        d="M15.55 11.7h3.35c1.65 0 2.85 1.15 2.85 2.65v.45c0 1.35-1.05 2.45-2.45 2.45h-3.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bit */}
      <path
        d="M21.35 17.25H22"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Tobacco leaf icon — simple leaf like the "Blends" tile (clean outline + midrib).
 */
export function TobaccoLeafIcon({ className = "h-5 w-5", strokeWidth = 2.0 }) {
  return (
    <Svg className={className} viewBox="0 0 24 24">
      {/* Leaf outline */}
      <path
        d="M20 4.8c-5.8.3-10.3 2.9-12.8 6.3C4.9 14.2 5.4 18.9 5.4 18.9s4.7.5 7.8-1.8C16.6 14.6 19.7 10.6 20 4.8Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Midrib */}
      <path
        d="M7.4 16.4c2.4-2.4 6.4-5.2 10.7-7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}