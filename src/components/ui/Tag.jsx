import { cn } from "@/lib/utils";

export default function Tag({ children, color = "default", className = "" }) {
  const styles = {
    default: "bg-[#3a2a1f] text-[#E0D8C8]",
    accent: "bg-[#6b4a2d] text-white",
    info: "bg-[#2f3e5a] text-[#d6e2ff]",
  };

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium",
        styles[color],
        className
      )}
    >
      {children}
    </span>
  );
}