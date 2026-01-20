import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-white/10 bg-[#1A2B3A] px-3 py-2 text-base text-[#E0D8C8]",
        "placeholder:text-[#E0D8C8]/40",
        "focus:outline-none focus:ring-2 focus:ring-[#A35C5C]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }