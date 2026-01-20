import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-lg border border-white/10 bg-[#162433] px-3 py-2 text-base text-[#E0D8C8] shadow-sm placeholder:text-[#E0D8C8]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35C5C]/60 focus-visible:ring-offset-0 focus-visible:border-[#E0D8C8]/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors hover:border-white/15",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }