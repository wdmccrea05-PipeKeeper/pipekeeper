import React from "react";

/**
 * PipeKeeper Icons
 * - All icons are inline SVG, themeable via currentColor.
 * - Accepts className to control size/color (Tailwind).
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function PipeIcon({ className, title = "Pipe", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("inline-block", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      {...props}
    >
      {/* Bowl rim */}
      <ellipse
        cx="6.8"
        cy="8.2"
        rx="3.1"
        ry="1.4"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Bowl body */}
      <path
        d="M3.7 8.2v3.7c0 2 1.4 3.6 3.1 3.6s3.1-1.6 3.1-3.6V8.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shank */}
      <path
        d="M9.9 11.3h3.0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Stem curve */}
      <path
        d="M12.9 11.3c2.6 0 4.6 0.2 6.4 1.3 0.8 0.5 1.2 1.2 1.2 2.1 0 1.6-1.2 2.6-2.8 2.6H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mouthpiece */}
      <path
        d="M16 16h-2.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Leaf icon (matches the “Blends” card style: single leaf, center vein, small stem)
 */
export function TobaccoLeafIcon({ className, title = "Tobacco", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("inline-block", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      {...props}
    >
      {/* Leaf outline */}
      <path
        d="M19.5 4.8c-7.7.6-13.3 4.8-14.6 11.1-.7 3.6 1.7 6.1 5.2 5.3C16.5 20 20 14.3 19.5 4.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Center vein */}
      <path
        d="M7 20c3.7-4.3 7.9-7.7 12.4-10.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Small stem */}
      <path
        d="M6.2 20.7c.5-.8 1.1-1.6 1.7-2.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Optional: small utility if you ever want to show both in a single export set
export const PipeKeeperIcons = {
  PipeIcon,
  TobaccoLeafIcon,
};