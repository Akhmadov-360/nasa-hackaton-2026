'use client';
import type { ComponentProps, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * A tooltip around one element, in place of the browser's native `title` (which is slow, unstyled, absent on touch and
 * not translated by our theme). Pass the element as the only child; it keeps its own role and `aria-label`.
 * With no label it renders the child untouched.
 */
export function Tip({ label, children, side, className }: { label?: ReactNode; children: ReactNode; side?: ComponentProps<typeof TooltipContent>['side']; className?: string }) {
  if (!label) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>{label}</TooltipContent>
    </Tooltip>
  );
}
