import React from 'react';

export default function PipeIcon({ className = "w-5 h-5" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Bowl */}
      <path d="M3 14c0 2.2 1.8 4 4 4s4-1.8 4-4v-3H3v3z" />
      
      {/* Shank */}
      <path d="M11 11h6" />
      
      {/* Stem (bent) */}
      <path d="M17 11c0 0 1 0 2 1s2 3 2 3" />
      
      {/* Bit */}
      <circle cx="21" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}