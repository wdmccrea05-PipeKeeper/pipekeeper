import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[#E0D8C8]/15 bg-[#1A2B3A]/50 px-3 py-1 text-base text-[#E0D8C8] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#E0D8C8] placeholder:text-[#E0D8C8]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[44px]",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }