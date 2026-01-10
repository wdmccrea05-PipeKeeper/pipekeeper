import React from "react";

/** Shared wrapper: respects className sizing + currentColor */
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

/** Tobacco pipe icon (clear pipe silhouette) */
export function PipeIcon({ className = "h-5 w-5", strokeWidth = 1.8 }) {
  return (
    <Svg className={className}>
      <path
        d="M3 14.5h8.5c2.2 0 4-1.8 4-4V8.8c0-.4.3-.8.8-.8h1.4c.9 0 1.7.7 1.7 1.7V12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14.5v2.2c0 1.2 1 2.3 2.3 2.3h5.5c1.2 0 2.3-1 2.3-2.3v-2.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.7 12h2.1c.9 0 1.7.8 1.7 1.7v2.7c0 .9-.8 1.7-1.7 1.7h-2.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Tobacco leaf icon (more "tobacco leaf" than generic leaf) */
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

/** Jar / tins icon for cellar (reads as "container", not a box) */
export function CellarJarIcon({ className = "h-5 w-5", strokeWidth = 1.8 }) {
  return (
    <Svg className={className}>
      <path
        d="M7 6.5h10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M8 6.5V5.3c0-.7.6-1.3 1.3-1.3h5.4c.7 0 1.3.6 1.3 1.3v1.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M7.2 9.1c0-1.1.9-2 2-2h5.6c1.1 0 2 .9 2 2v9.2c0 1.1-.9 2-2 2H9.2c-1.1 0-2-.9-2-2V9.1Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M9.3 12.2h5.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9.3 15.4h5.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** "AI Tobacconist" icon (simple portrait-style badge, consistent + crisp) */
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
      {/* tiny pipe cue */}
      <path
        d="M18.8 20.2h2.2c.6 0 1 .4 1 1v.9c0 .6-.4 1-1 1h-1.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}