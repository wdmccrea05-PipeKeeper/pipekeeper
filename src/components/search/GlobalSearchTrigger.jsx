import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import GlobalSearchCommand from './GlobalSearchCommand';
import { cn } from '@/lib/utils';

export default function GlobalSearchTrigger({ className }) {
  const [open, setOpen] = useState(false);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#A35C5C]/30 bg-[#1A2B3A]/50 text-[#E0D8C8]/70 hover:bg-[#A35C5C]/20 hover:text-[#E0D8C8] transition-all",
          className
        )}
      >
        <Search className="w-4 h-4" />
        <span className="text-sm hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1A2B3A]/80 border border-[#A35C5C]/40 rounded text-xs">
          <span>⌘</span>K
        </kbd>
      </button>

      <GlobalSearchCommand open={open} onClose={() => setOpen(false)} />
    </>
  );
}