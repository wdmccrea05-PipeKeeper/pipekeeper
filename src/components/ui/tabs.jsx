import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-2xl gap-1 p-1 border border-[rgba(140,105,65,0.35)] bg-[linear-gradient(145deg,rgba(40,28,20,0.92),rgba(32,22,15,0.96))] shadow-[inset_0_1px_0_rgba(200,160,110,0.08)]",
        className
      )}
      {...props}
    />
  );
});

const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-[#D8C7A6]/80 transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-[#A35C5C] data-[state=active]:text-white data-[state=active]:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.35)]",
        "hover:text-[#F5F1E7] hover:bg-[rgba(163,92,92,0.12)]",
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
        "mt-4 ring-offset-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60",
        className
      )}
      {...props}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent };
