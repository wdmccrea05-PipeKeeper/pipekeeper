import { cn } from "@/lib/utils";

/**
 * Skeleton — warm-tinted shimmer, matches the dark palette.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[rgba(180,140,75,0.08)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };