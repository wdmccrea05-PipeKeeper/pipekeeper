import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * One diagnostics section: a title, the measures it carries and the line that
 * says what the numbers cover, so an empty section is never read as "healthy".
 */
export default function DiagnosticCard({ title, measures = [], coverage, tone = "default" }) {
  const toneClass = tone === "warning" ? "text-[#E8B87A]" : "text-[#D4A574]";

  return (
    <Card className="border-white/10" style={{ background: "rgba(42,31,24,0.96)" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#F5F1E7] break-words">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {measures.map((measure) => (
            <div key={measure.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-[#E0D8C8]/55 break-words">
                {measure.label}
              </dt>
              <dd className={`text-lg font-semibold ${toneClass} break-words`}>{measure.value}</dd>
            </div>
          ))}
        </dl>

        {coverage && (
          <p className="text-xs leading-relaxed text-[#E0D8C8]/60 break-words">{coverage}</p>
        )}
      </CardContent>
    </Card>
  );
}