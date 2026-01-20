import React from 'react';
import { PK_THEME } from "@/components/theme/pkTheme";

export default function PkSectionHeader({ title, subtitle, level = "page" }) {
  if (level === "page") {
    return (
      <div className="mb-8">
        <h1 className={`${PK_THEME.textTitle} text-3xl sm:text-4xl font-bold`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`${PK_THEME.textSubtle} text-sm sm:text-base mt-2`}>
            {subtitle}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="mb-4">
      <h2 className={`${PK_THEME.textHeading} text-xl font-semibold`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`${PK_THEME.textMuted} text-sm mt-1`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}