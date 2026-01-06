import { useEffect } from "react";

export default function DocumentTitle({ title = "PipeKeeper" }) {
  useEffect(() => {
    document.title = title;
    const t = setTimeout(() => (document.title = title), 50);
    return () => clearTimeout(t);
  }, [title]);

  return null;
}