import { cn } from '@/lib/utils';

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn('num inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-ink/60 px-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Kbd };
