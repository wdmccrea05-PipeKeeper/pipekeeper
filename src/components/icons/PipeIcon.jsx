import React from "react";

export default function PipeIcon({
  className = "w-5 h-5",
  color = "currentColor",
  title = "Pipe",
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <path
        d="M18 14h10c6 0 10 4 10 10v6c0 7-5 12-12 12h-2c-7 0-12-5-12-12v-4c0-7 5-12 12-12Z"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.18"
      />
      <path
        d="M26 14v-4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M22 14v-3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M38 31h9c7 0 13 5 13 12v1"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60 44c0 4.5-3.5 8-8 8H36"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 52h8"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
