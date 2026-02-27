import React from 'react';
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

export default function FieldWithInfo({ label, required, helpText, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="break-words">{label} {required && '*'}</Label>
        {helpText && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-stone-400 hover:text-amber-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm text-stone-600">
              {helpText}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {children}
    </div>
  );
}