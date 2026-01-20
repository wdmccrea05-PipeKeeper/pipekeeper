import React from 'react';
import { PK_THEME } from "@/components/theme/pkTheme";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function PkInput(props) {
  return (
    <Input 
      {...props} 
      className={cn(PK_THEME.input, PK_THEME.inputFocus, props.className)}
    />
  );
}