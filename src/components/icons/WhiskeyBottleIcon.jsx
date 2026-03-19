import React from "react";

export default function WhiskeyBottleIcon({
  className = "w-5 h-5",
  color = "currentColor",
  title = "Bottle",
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={title} fill="none">
      <path d="M10 3h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M11 3v4l-3.2 5.3A4.7 4.7 0 0 0 11.9 19h.2a4.7 4.7 0 0 0 4.1-6.4L13 7V3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.4 12h5.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
