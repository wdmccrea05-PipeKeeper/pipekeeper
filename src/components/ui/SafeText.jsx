import React from 'react';
import { cn } from "@/lib/utils";

/**
 * SafeText Component
 * 
 * Ensures safe text rendering across all languages and screen sizes:
 * - min-width: 0 for flex children (prevents overflow in flex containers)
 * - overflow-wrap: anywhere (wraps long strings, supports CJK)
 * - Respects max-width and truncation only when explicitly intended
 * - Includes tooltip fallback for truncated content
 */

export function SafeText({ 
  children, 
  className = '', 
  truncate = false,
  lines = null,
  title = null,
  as: Component = 'span',
  ...props 
}) {
  const baseClasses = 'min-w-0 overflow-wrap-anywhere break-word';
  
  let truncateClass = '';
  if (truncate) {
    truncateClass = lines ? `line-clamp-${lines}` : 'truncate';
  }

  // Use title for tooltip if content is truncated
  const effectiveTitle = (truncate && !title) ? (typeof children === 'string' ? children : undefined) : title;

  return (
    <Component
      className={cn(baseClasses, truncateClass, className)}
      title={effectiveTitle}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * SafeHeading Component
 * 
 * For headings with long content (especially in stress languages).
 * Prevents overflow while maintaining readability across breakpoints.
 */
export function SafeHeading({
  level = 'h2',
  children,
  className = '',
  truncate = false,
  ...props
}) {
  const headingClass = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
  }[level] || '';

  return (
    <SafeText
      as={level}
      className={cn(headingClass, 'leading-tight', className)}
      truncate={truncate}
      {...props}
    >
      {children}
    </SafeText>
  );
}

/**
 * SafeLabel Component
 * 
 * For form labels and short field labels.
 * Ensures labels don't overflow in small containers.
 */
export function SafeLabel({
  children,
  className = '',
  required = false,
  ...props
}) {
  return (
    <SafeText
      as="label"
      className={cn('text-sm font-medium', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </SafeText>
  );
}

/**
 * SafeCell Component
 * 
 * For table cells and card content with long strings.
 * Handles word breaking, CJK text, and flex layout safety.
 */
export function SafeCell({
  children,
  className = '',
  truncate = false,
  lines = null,
  ...props
}) {
  return (
    <SafeText
      className={cn(
        'inline-block min-w-0 max-w-full',
        truncate && !lines && 'truncate',
        truncate && lines && `line-clamp-${lines}`,
        className
      )}
      {...props}
    >
      {children}
    </SafeText>
  );
}