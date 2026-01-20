import React from 'react';
import { PK_THEME } from '@/components/utils/pkTheme';
import { cn } from '@/lib/utils';

export const PkCard = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn(PK_THEME.card, className)} {...props}>
    {children}
  </div>
));
PkCard.displayName = 'PkCard';

export const PkCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 border-b border-[#2C3E55]', className)} {...props} />
));
PkCardHeader.displayName = 'PkCardHeader';

export const PkCardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn(`${PK_THEME.textTitle} text-xl font-semibold`, className)} {...props} />
));
PkCardTitle.displayName = 'PkCardTitle';

export const PkCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6', className)} {...props} />
));
PkCardContent.displayName = 'PkCardContent';