import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

/**
 * One matte finish for every button, like the cards: a soft fill, a faint highlight on the top edge, no outline.
 * Hover only brightens the fill; keyboard focus keeps a visible ring for accessibility.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[background-color,color,transform] duration-200 outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary hover:bg-primary/25',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'text-muted-foreground shadow-none hover:bg-accent hover:text-foreground',
        outline: 'bg-secondary/70 text-secondary-foreground hover:bg-accent',
        destructive: 'bg-destructive/15 text-destructive hover:bg-destructive/25',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
