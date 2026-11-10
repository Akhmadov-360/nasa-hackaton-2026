'use client';
import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Slider({ className, children, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn('relative flex h-6 w-full touch-none items-center select-none', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-ink/70">
        <SliderPrimitive.Range className="absolute h-full bg-primary/60" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-5 cursor-grab rounded-full border-2 border-primary bg-background shadow outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" />
      {children}
    </SliderPrimitive.Root>
  );
}

export { Slider };
