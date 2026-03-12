import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border text-[#F5F1E7] shadow-lg",
      "border-[rgba(140,105,65,0.35)] bg-[linear-gradient(145deg,rgba(40,28,20,0.95),rgba(32,22,15,0.95))]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 border-b border-[rgba(140,105,65,0.2)]", className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-[#E0D8C8]", className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-[rgba(224,216,200,0.7)]", className)} {...props} />
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