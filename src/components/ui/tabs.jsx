import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/**
 * TabsList — pill container with warm border and gradient.
 */
const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex flex-wrap items-center justify-start gap-1 rounded-2xl p-1.5",
        "border border-[rgba(180,140,75,0.28)]",
        "bg-[linear-gradient(145deg,rgba(51,55,57,0.94),rgba(43,47,49,0.97))]",
        "shadow-[inset_0_1px_0_rgba(200,160,100,0.06)]",
        className
      )}
      {...props}
    />
  );
});

/**
 * TabsTrigger — larger hit target, gold-tinted active state.
 */
const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap",
        "min-h-11 rounded-xl px-4 py-2 text-sm font-medium",
        "text-[#deded8] transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(180,140,75,0.50)]",
        "disabled:pointer-events-none disabled:opacity-40",
        "hover:text-[#F5F1E7] hover:bg-[rgba(180,140,75,0.10)]",
        // Active state — strong filled pill
        "data-[state=active]:bg-[#eae9e4] data-[state=active]:text-[#282b2d]",
        "data-[state=active]:shadow-[0_2px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
      {...props}
    />
  );
});

const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(180,140,75,0.40)]",
        className
      )}
      {...props}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent };