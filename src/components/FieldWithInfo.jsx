/**
 * Field with Info Tooltip
 * Reusable component for form fields with explanatory help bubbles
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function FieldWithInfo({ label, info, children, required = false }) {
  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-[#E0D8C8]">
            {label}
            {required && <span className="text-red-400">*</span>}
          </label>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-white/10 transition-all"
                >
                  <HelpCircle className="w-4 h-4 text-[#D4A574]" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-xs bg-[#243548] border border-[#D4A574]/30 text-[#E0D8C8] text-sm"
              >
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {children}
      </div>
    </TooltipProvider>
  );
}