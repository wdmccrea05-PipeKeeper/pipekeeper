import React from 'react';
import { Button } from "@/components/ui/button";
import { PK_THEME } from "@/components/theme/pkTheme";
import { cn } from "@/lib/utils";

export default function PkButton({ 
  variant = "primary", 
  children, 
  className = "",
  ...props 
}) {
  const variantStyles = {
    primary: PK_THEME.primaryBtn,
    secondary: PK_THEME.secondaryBtn,
    danger: PK_THEME.dangerBtn,
  };

  const style = variantStyles[variant] || variantStyles.primary;

  return (
    <Button 
      className={cn(style, className)}
      {...props}
    >
      {children}
    </Button>
  );
}