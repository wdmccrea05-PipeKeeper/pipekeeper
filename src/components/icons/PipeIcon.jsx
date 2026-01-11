import React from 'react';

export default function PipeIcon({ className = "w-5 h-5" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Bowl - cylindrical billiard shape */}
      <ellipse cx="5.5" cy="10" rx="2" ry="1.5" />
      <path d="M3.5 10v4c0 1.1.9 2 2 2s2-.9 2-2v-4" />
      
      {/* Shank */}
      <path d="M7.5 12h6" />
      
      {/* Stem - bent upward */}
      <path d="M13.5 12c1 0 2 .5 3 1.5s1.5 2.5 2 3.5" />
      
      {/* Bit end */}
      <circle cx="18.5" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}