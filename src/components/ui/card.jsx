import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border text-[#E8D9BF] shadow-sm backdrop-blur-[2px]",
      className
    )}
    style={{
      background: "linear-gradient(180deg, rgba(54,38,27,0.94) 0%, rgba(31,22,16,0.96) 100%)",
      borderColor: "rgba(154, 118, 76, 0.22)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)",
    }}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = ({ className, ...props }) => (
  <div className={cn("p-5 border-b", className)} style={{ borderColor: "rgba(154,118,76,0.16)" }} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-[#F3E8D4]", className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-[#D7C4A7]/80", className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn("p-5", className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn("p-5 border-t", className)} style={{ borderColor: "rgba(154,118,76,0.16)" }} {...props} />
)

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
