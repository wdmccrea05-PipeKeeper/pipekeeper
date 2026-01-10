import React from "react";

export function TinJarIcon({ className = "h-5 w-5", title = "Tins" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      {/* Lid */}
      <path
        d="M18 14c0-3 2.5-5 5.5-5h17c3 0 5.5 2 5.5 5v4H18v-4z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Jar body */}
      <path
        d="M16 22h32v28c0 4-3.2 7-7.2 7H23.2C19.2 57 16 54 16 50V22z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Label band */}
      <path
        d="M20 34h24v10H20V34z"
        fill="rgba(0,0,0,0.18)"
      />
    </svg>
  );
}