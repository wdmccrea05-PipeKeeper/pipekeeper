import React from 'react';
import { PK_THEME } from "@/components/theme/pkTheme";

export default function PkPageShell({ children, className = "" }) {
  return (
    <div className={`min-h-screen ${PK_THEME.pageBg} ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}