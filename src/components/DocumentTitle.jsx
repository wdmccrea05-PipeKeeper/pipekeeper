import { useEffect } from "react";

export default function DocumentTitle({ title = "PipeKeeper" }) {
  useEffect(() => {
    try {
      document.title = title;
    } catch {}
  }, [title]);

  return null;
}