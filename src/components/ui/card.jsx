import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border text-[#E0D8C8] shadow-sm",
      "border-[#8b6239]/25 bg-gradient-to-br from-[#2a1f18] to-[#1f1510]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 border-b border-[#8b6239]/20", className)} {...props} />
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