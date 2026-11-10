import { cn } from '@/lib/utils';

/** Placeholder while data has not arrived yet. Respects reduced motion via the global rule. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-accent/60', className)} {...props} />;
}

export { Skeleton };
