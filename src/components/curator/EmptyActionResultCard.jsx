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
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(46, 125, 92, 0.3)",
        background: "linear-gradient(135deg, rgba(46, 125, 92, 0.08), rgba(30, 50, 40, 0.3))",
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <CheckCircle2
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "#4A7C59" }}
        />
        <div>
          <h4
            className="font-semibold text-base"
            style={{ color: "#F5F1E7" }}
          >
            No actionable recommendations right now
          </h4>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245, 241, 231, 0.7)" }}
          >
            {summary || "Curator reviewed your collection but found no immediate improvements."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {onAskCurator && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAskCurator}
            className="gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask Curator a Question
          </Button>
        )}

        {onDismiss && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}