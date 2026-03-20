/**
 * Curator Action Status Bar
 * 
 * Shows action execution status during AI analysis
 * NOT a chat bubble — styled as a status indicator
 */

import React from "react";
import { Zap } from "lucide-react";

export default function CuratorActionStatusBar({
  actionLabel,
  isRunning = false,
  progress = 0,
}) {
  if (!isRunning) return null;

  return (
    <div
      className="rounded-lg px-4 py-3 mb-4 flex items-center gap-3 animate-pulse"
      style={{
        background: "linear-gradient(135deg, rgba(180,140,75,0.15), rgba(180,140,75,0.08))",
        border: "1px solid rgba(180,140,75,0.25)",
      }}
    >
      <Zap
        className="w-5 h-5 flex-shrink-0"
        style={{
          color: "rgba(212,165,116,1)",
          animation: "spin 1s linear infinite",
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-tight"
          style={{ color: "rgba(212,165,116,1)" }}
        >
          {actionLabel || "Running expert analysis…"}
        </p>
        {progress > 0 && progress < 100 && (
          <div
            className="h-1 rounded-full mt-1.5 overflow-hidden"
            style={{ background: "rgba(180,140,75,0.2)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: "rgba(212,165,116,0.6)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}