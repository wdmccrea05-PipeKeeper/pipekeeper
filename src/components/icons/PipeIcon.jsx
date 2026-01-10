import React from "react";

export function PipeIcon({ className = "h-5 w-5", title = "Pipe" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
    >
      {/* Bowl */}
      <path
        d="M14 26c0-2.8 2.2-5 5-5h10c4.4 0 8 3.6 8 8v10c0 7.2-5.8 13-13 13h-4c-3.3 0-6-2.7-6-6V26z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Shank */}
      <path
        d="M37 34h11c5.5 0 10 4.5 10 10v2H37V34z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Stem */}
      <path
        d="M58 46c0 2.2-1.8 4-4 4H37v-4h21z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Negative cut for bowl rim */}
      <path
        d="M20 24h10c3.3 0 6 2.7 6 6v2H20v-8z"
        fill="rgba(0,0,0,0.18)"
      />
    </svg>
  );
}