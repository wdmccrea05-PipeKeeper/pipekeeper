import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/10 bg-[#223447] text-[#E0D8C8] shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 border-b border-white/10", className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-[#E0D8C8]", className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-[#E0D8C8]/70", className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn("p-5", className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn("p-5 border-t border-white/10", className)} {...props} />
)

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}