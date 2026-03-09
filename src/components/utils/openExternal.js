export function openExternal(url) {
  // Works in web preview; safe noop fallback if window not available
  if (typeof window !== "undefined" && url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
