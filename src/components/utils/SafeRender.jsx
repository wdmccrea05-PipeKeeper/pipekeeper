import React from "react";
import { formatTobacconistResponse } from "./formatTobacconistResponse";

/**
 * Safely renders any value type without crashing React.
 * - Strings: render as text with formatting applied
 * - Objects/arrays: extract summary field or JSON stringify
 * - Numbers/booleans: convert to string
 */
export function SafeRender({ value, className = "" }) {
  if (value == null) return null;

  // String: apply formatting for readability
  if (typeof value === "string") {
    const formatted = formatTobacconistResponse(value);
    return <div className={className}>{formatted}</div>;
  }

  // Number or boolean: stringify
  if (typeof value === "number" || typeof value === "boolean") {
    return <div className={className}>{String(value)}</div>;
  }

  // Object or array: prefer summary fields
  try {
    const summary =
      value?.summary ||
      value?.detailed_reasoning ||
      value?.redundancy_analysis ||
      value?.advice ||
      value?.response ||
      value?.message;

    if (typeof summary === "string" && summary.trim()) {
      const formatted = formatTobacconistResponse(summary);
      return <div className={className}>{formatted}</div>;
    }

    // Fallback: stringify with formatting
    const jsonStr = JSON.stringify(value, null, 2);
    const formatted = formatTobacconistResponse(jsonStr);
    return (
      <pre className={`${className} whitespace-pre-wrap text-sm leading-relaxed font-mono`}>
        {formatted}
      </pre>
    );
  } catch (err) {
    return (
      <div className={className}>
        [Unable to render response - internal error]
      </div>
    );
  }
}