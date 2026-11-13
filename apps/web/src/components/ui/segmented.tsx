'use client';
import type { ReactNode } from 'react';
import RubberSegment from '@/components/RubberSegment';

export interface SegmentedItem {
  value: string;
  label: ReactNode;
}

/**
 * The one tab / filter control of the app (the rubber-band segmented control), with the dashboard's colours.
 * Use it wherever a set of exclusive views or filters is shown; do not add another tab component.
 */
export function Segmented({
  items, value, onChange, size = 'sm', disabled, label, className,
}: {
  items: SegmentedItem[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <RubberSegment
      items={items} value={value} onChange={(v) => onChange(v)} equalSlots={false} size={size} radius={size === 'md' ? 14 : 11}
      disabled={disabled} aria-label={label} className={className}
      trackColor="#0b1220" thumbColor="#1f2b46" textColor="#9fb0c9" activeTextColor="#eaf1ff"
    />
  );
}
