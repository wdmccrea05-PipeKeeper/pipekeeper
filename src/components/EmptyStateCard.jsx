import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EMPTY_STATE, A11Y, cn } from '@/components/utils/theme';

/**
 * Standardized empty state component with consistent styling
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component (lucide-react)
 * @param {string} props.title - Main heading
 * @param {string} props.description - Description text
 * @param {React.ReactNode} props.action - Optional action button
 * @param {string} props.className - Additional classes
 */
export default function EmptyStateCard({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}) {
  return (
    <Card className={className}>
      <CardContent className={EMPTY_STATE.container}>
        {Icon && <Icon className={EMPTY_STATE.icon} aria-hidden="true" />}
        <h3 className={EMPTY_STATE.title}>{title}</h3>
        {description && <p className={EMPTY_STATE.description}>{description}</p>}
        {action && (
          <div className={cn('flex justify-center', A11Y.focusRing)}>
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}