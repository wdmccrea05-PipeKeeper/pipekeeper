import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(function TabsList(
  { className, ...props },
  ref
) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl bg-white/5 p-1 text-[#E0D8C8]/70 border border-[#E0D8C8]/10",
        className
      )}
      {...props}
    />
  );
});

const TabsTrigger = React.forwardRef(function TabsTrigger(
  { className, ...props },
  ref
) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0",
        "data-[state=active]:bg-[#A35C5C]/80 data-[state=active]:text-[#E0D8C8] data-[state=active]:shadow",
        "data-[state=inactive]:text-[#E0D8C8]/70 data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:text-[#E0D8C8]",
        className
      )}
      {...props}
    />
  );
});

const TabsContent = React.forwardRef(function TabsContent(
  { className, ...props },
  ref
) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0",
        className
      )}
      {...props}
    />
  );
});

export { Tabs, TabsList, TabsTrigger, TabsContent };