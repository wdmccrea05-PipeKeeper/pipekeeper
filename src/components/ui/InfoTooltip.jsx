import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InfoTooltip({ text, className }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className={cn(
          "text-[#E0D8C8]/50 hover:text-[#E0D8C8]/80 transition-colors",
          className
        )}
        aria-label="More info"
      >
        <Info className="w-4 h-4" />
      </button>
      
      {show && (
        <div className="absolute z-50 w-64 p-3 text-sm bg-[#1A2B3A] border border-[#E0D8C8]/20 rounded-lg shadow-xl left-6 top-0 pointer-events-none">
          <p className="text-[#E0D8C8]/90 leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}