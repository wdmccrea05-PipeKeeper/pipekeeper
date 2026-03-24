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
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 12h10c5 0 8 3 8 8v8c0 6-4 10-10 10h-6c-5 0-8-3-8-8V20c0-5 2-8 6-8Z"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.14"
      />
      <path
        d="M28 30c8 0 14 2 18 6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M46 36h8c4 0 6 2 6 5s-2 5-6 5h-4"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 12v-3h12v3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}