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

export function PipeIcon({ className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <Svg className={className} viewBox="0 0 26 24">
      {/* Bowl */}
      <path
        d="M6 10.3c0-2.3 1.9-4.2 4.2-4.2h3.2c2.3 0 4.2 1.9 4.2 4.2v6.2c0 3.4-2.8 6.2-6.2 6.2S6 19.9 6 16.5v-6.2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Rim */}
      <path
        d="M8.4 6.7h6.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Shank + stem (bent) */}
      <path
        d="M17.6 12.6h3.8c1.9 0 3.4 1.5 3.4 3.4v.5c0 1.3-1 2.4-2.4 2.4h-4.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 12.6c.5-3 3-5.1 6.1-5.1H25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Bit */}
      <path
        d="M24.2 18.9h.8"
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
        d="M12.1 16.2h.9M19 16.2h.9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18.2 18.4c-.7.9-1.5 1.3-2.2 1.3s-1.5-.4-2.2-1.3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18.8 20.2h2.2c.6 0 1 .4 1 1v.9c0 .6-.4 1-1 1h-1.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}