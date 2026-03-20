/**
 * CURATOR ACTION ERROR CARD
 * 
 * Displays structured errors from curator action execution.
 * Never shows raw JSON, stack traces, or prompts.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCw, MessageCircle } from "lucide-react";

export default function CuratorActionErrorCard({
  error,
  onRetry,
  onAskCurator,
  actionLabel = "Curator Action",
}) {
  if (!error) return null;

  return (
    <div
      className="rounded-xl p-6 mb-6 border"
      style={{
        background: "linear-gradient(135deg, rgba(139,58,58,0.15), rgba(109,46,46,0.1))",
        borderColor: "rgba(139,58,58,0.35)",
      }}
    >
      <div className="flex gap-3">
        <AlertCircle
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "#F5D4D4" }}
        />
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold mb-1 text-base"
            style={{ color: "#F5D4D4" }}
          >
            {error.title || "Curator action could not be completed"}
          </h3>
          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: "rgba(245,212,212,0.85)" }}
          >
            {error.message || error.error || "An unexpected error occurred."}
          </p>

          <div className="flex gap-2 flex-wrap">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            )}
            {onAskCurator && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAskCurator}
                className="gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Ask Curator Instead
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}