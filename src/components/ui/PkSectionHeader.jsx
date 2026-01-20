import React from 'react';
import { PK_THEME } from '@/components/utils/pkTheme';
import { cn } from '@/lib/utils';

export const PkPageTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h1 ref={ref} className={cn(`${PK_THEME.textTitle} text-4xl font-bold`, className)} {...props} />
));
PkPageTitle.displayName = 'PkPageTitle';

export const PkSectionTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn(`${PK_THEME.textHeading} text-2xl font-semibold`, className)} {...props} />
));
PkSectionTitle.displayName = 'PkSectionTitle';

export const PkSubsectionTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn(`${PK_THEME.textHeading} text-lg font-semibold`, className)} {...props} />
));
PkSubsectionTitle.displayName = 'PkSubsectionTitle';

export const PkLabel = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(`${PK_THEME.textBody} font-medium`, className)} {...props} />
));
PkLabel.displayName = 'PkLabel';

export const PkText = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn(`${PK_THEME.textBody}`, className)} {...props} />
));
PkText.displayName = 'PkText';

export const PkSubtext = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn(`${PK_THEME.textMuted} text-sm`, className)} {...props} />
));
PkSubtext.displayName = 'PkSubtext';