import React from "react";

function Svg({ children, className = "", viewBox = "0 0 24 24" }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function PipeIcon({ className = "h-5 w-5", strokeWidth = 2.1 }) {
  return (
    <Svg className={className} viewBox="0 0 24 24">
      {/* Classic bent briar pipe (clear silhouette at small sizes) */}
      {/* Bowl */}
      <path
        d="M5.6 10.6c0-2.2 1.8-4 4-4h3c2.2 0 4 1.8 4 4v4.9c0 3.2-2.6 5.8-5.8 5.8S5.6 18.7 5.6 15.5v-4.9Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Rim */}
      <path
        d="M7.9 6.6h6.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Shank */}
      <path
        d="M16.6 12.1h3.2c1.8 0 3.2 1.4 3.2 3.2v.4c0 1.4-1.1 2.5-2.5 2.5h-4.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bent stem curve */}
      <path
        d="M16.6 12.1c.35-2.55 2.45-4.4 5.05-4.4H23"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Bit */}
      <path
        d="M22.1 18.2h.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TobaccoLeafIcon({ className = "h-5 w-5", strokeWidth = 1.8 }) {
  return (
    <Svg className={className}>
      <path
        d="M20.5 4.8c-6.2.2-11 3.1-13.6 6.9C4.5 15.3 5 19.2 5 19.2s3.9.5 7.5-1.9c3.8-2.6 6.7-7.4 6.9-13.6Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M7.5 16.6c2.6-2.7 6.6-5.5 10.7-7.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M12.2 18.3c-.6-2.6-1-6.7.1-11"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CellarJarIcon({ className = "h-5 w-5", strokeWidth = 1.8 }) {
  return (
    <Svg className={className}>
      <path d="M7 7c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M7 7v3.5c0 1.1 2.2 2 5 2s5-.9 5-2V7" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M7 13.5c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M7 13.5V17c0 1.1 2.2 2 5 2s5-.9 5-2v-3.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M9.2 5.9h5.6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function AITobacconistIcon({ className = "h-6 w-6", strokeWidth = 1.7 }) {
  return (
    <Svg className={className} viewBox="0 0 32 32">
      <path
        d="M16 28c6.6 0 12-5.4 12-12S22.6 4 16 4 4 9.4 4 16s5.4 12 12 12Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M11.2 22.6c1.3-2.2 3.2-3.3 4.8-3.3s3.5 1.1 4.8 3.3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M12.2 14.2c.8-1.3 2.1-2.1 3.8-2.1s3 .8 3.8 2.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M13 12c.4-1.6 1.5-2.6 3-2.6s2.6 1 3 2.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M16 6.5v1.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}