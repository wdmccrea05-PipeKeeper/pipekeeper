import React from "react";

export default function PipeIcon({
  className = "w-5 h-5",
  color = "currentColor",
  title = "Pipe",
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bowl */}
      <path
        d="M14 10 C14 10 10 10 10 18 L10 30 C10 30 10 36 16 36 L26 36 C26 36 30 36 30 30 L30 18 C30 18 30 10 26 10 Z"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.12"
      />
      {/* Shank connecting bowl to stem */}
      <path
        d="M26 28 C32 28 36 30 36 34"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stem — long horizontal */}
      <path
        d="M36 34 Q44 34 54 32"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mouthpiece tip */}
      <path
        d="M54 32 L58 31"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}