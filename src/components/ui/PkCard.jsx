import React from 'react';
import { PK_THEME } from "@/components/theme/pkTheme";
import { cn } from "@/lib/utils";

export default function PkCard({ children, className = "", soft = false }) {
  const cardStyle = soft ? PK_THEME.cardSoft : PK_THEME.card;
  return (
    <div className={cn(cardStyle, className)}>
      {children}
    </div>
  );
}