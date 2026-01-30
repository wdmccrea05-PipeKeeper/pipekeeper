/**
 * SafeRender utilities for rendering potentially unsafe/unknown object shapes
 * Prevents "Objects are not valid as a React child" errors
 */

export function safeToString(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  // Extract from common object shapes
  if (typeof val === "object") {
    const maybe = val?.name || val?.title || val?.label || val?.text || val?.message || val?.value;
    if (typeof maybe === "string") return maybe;

    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  return String(val);
}

export function safeArrayMap(arr, renderFn) {
  if (!Array.isArray(arr)) return null;
  return arr.filter(Boolean).map((item, idx) => {
    try {
      return renderFn(item, idx);
    } catch (e) {
      console.warn("[SafeRender] Map error:", e, item);
      return <span key={idx} className="text-xs text-red-500">Error rendering item</span>;
    }
  });
}

export function SafeObjectDisplay({ obj, maxDepth = 2 }) {
  if (obj == null) return null;

  const renderValue = (val, depth = 0) => {
    if (depth > maxDepth) return <span className="text-xs text-gray-500">…</span>;

    if (typeof val === "string") return <span>{val}</span>;
    if (typeof val === "number" || typeof val === "boolean") return <span>{String(val)}</span>;
    if (Array.isArray(val)) {
      return (
        <ul className="ml-4 text-sm">
          {val.map((item, i) => (
            <li key={i}>{renderValue(item, depth + 1)}</li>
          ))}
        </ul>
      );
    }
    if (typeof val === "object" && val !== null) {
      return (
        <dl className="ml-4 text-sm space-y-1">
          {Object.entries(val).map(([k, v]) => (
            <div key={k} className="flex">
              <dt className="font-semibold">{k}:</dt>
              <dd className="ml-2">{renderValue(v, depth + 1)}</dd>
            </div>
          ))}
        </dl>
      );
    }
    return <span>{String(val)}</span>;
  };

  return <div className="bg-gray-900 p-2 rounded text-white text-xs">{renderValue(obj)}</div>;
}