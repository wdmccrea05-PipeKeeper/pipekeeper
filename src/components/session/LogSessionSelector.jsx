import React from "react";
import { X, BookOpen, GlassWater } from "lucide-react";

/**
 * LogSessionSelector
 * Modal that lets users pick between Pipe Session and Whiskey Tasting.
 * Props:
 *   isOpen: bool
 *   onClose: () => void
 *   onSelectPipe: () => void
 *   onSelectWhiskey: () => void
 */
export default function LogSessionSelector({ isOpen, onClose, onSelectPipe, onSelectWhiskey }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] bg-black/70 flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg,rgba(38,26,18,0.98),rgba(24,16,12,1))",
          border: "1px solid rgba(180,140,75,0.24)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-[rgba(180,140,75,0.14)]">
          <h3 className="font-bold text-[#F5F1E7] text-lg">Log Session</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-[#E0D8C8]/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { onClose(); onSelectPipe(); }}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg,rgba(180,140,75,0.12),rgba(140,100,50,0.06))",
              border: "1px solid rgba(180,140,75,0.3)",
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(180,140,75,0.15)", border: "1px solid rgba(180,140,75,0.3)" }}>
              <BookOpen className="w-5 h-5 text-[#D4A574]" />
            </div>
            <span className="text-sm font-semibold text-[#F5F1E7] text-center">Pipe Session</span>
          </button>

          <button
            type="button"
            onClick={() => { onClose(); onSelectWhiskey(); }}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg,rgba(196,122,58,0.12),rgba(160,95,40,0.06))",
              border: "1px solid rgba(196,122,58,0.3)",
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(196,122,58,0.15)", border: "1px solid rgba(196,122,58,0.3)" }}>
              <GlassWater className="w-5 h-5 text-[#C87941]" />
            </div>
            <span className="text-sm font-semibold text-[#F5F1E7] text-center">Whiskey Tasting</span>
          </button>
        </div>
      </div>
    </div>
  );
}