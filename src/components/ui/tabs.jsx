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
        "inline-flex h-10 items-center justify-center rounded-xl gap-1 p-1 border border-white/10 bg-[#162433]",
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
        "text-[#E0D8C8]/70 hover:text-[#E0D8C8] hover:bg-white/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0",
        "data-[state=active]:bg-[#A35C5C] data-[state=active]:text-[#FFF7ED] data-[state=active]:shadow-md",
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