import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, MessageCircle } from "lucide-react";

export default function CuratorActionErrorCard({
  error,
  onRetry,
  onAskCurator,
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(179, 95, 95, 0.3)",
        background: "linear-gradient(135deg, rgba(100, 50, 50, 0.1), rgba(50, 30, 30, 0.4))",
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <AlertCircle
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "#C87941" }}
        />
        <div>
          <h4
            className="font-semibold text-base"
            style={{ color: "#F5F1E7" }}
          >
            Curator could not complete this action
          </h4>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245, 241, 231, 0.7)" }}
          >
            {error || "Please try again."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            style={{
              background: "linear-gradient(135deg, rgba(212, 165, 116, 0.95), rgba(180, 140, 75, 1))",
              color: "white",
            }}
            className="hover:opacity-90"
          >
            Try Again
          </Button>
        )}

        {onAskCurator && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAskCurator}
            className="gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask Curator Instead
          </Button>
        )}
      </div>
    </div>
  );
}