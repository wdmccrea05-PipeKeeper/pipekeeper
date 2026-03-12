import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border bg-[#1a2b3a] px-3 py-2 text-base text-[#E0D8C8]",
        "border-[#8b6239]/25 placeholder:text-[#8b6239]/50",
        "focus:outline-none focus:ring-2 focus:ring-[#A35C5C]/50 focus:border-[#8b6239]/40",
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