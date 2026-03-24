/**
 * EMPTY ACTION RESULT CARD
 * 
 * Rendered when expert action completes with no actionable recommendations.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle } from "lucide-react";

export default function EmptyActionResultCard({
  summary,
  onAskCurator,
  onDismiss,
}) {
  return (
    <div
      className="rounded-xl p-6 mb-6 border"
      style={{
        background: "linear-gradient(135deg, rgba(46, 125, 92, 0.12), rgba(46, 125, 92, 0.08))",
        borderColor: "rgba(46, 125, 92, 0.35)",
      }}
    >
      <div className="flex gap-3">
        <CheckCircle2
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "#4A7C59" }}
        />
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold mb-1 text-base"
            style={{ color: "#4A7C59" }}
          >
            Analysis Complete
          </h3>
          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: "rgba(74, 124, 89, 0.9)" }}
          >
            {summary || "Curator reviewed your collection but found no actionable recommendations right now."}
          </p>

          <div className="flex gap-2 flex-wrap">
            {onAskCurator && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAskCurator}
                className="gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Ask a Follow-up Question
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}