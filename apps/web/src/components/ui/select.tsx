'use client';
import GlideSelect, { type GlideSelectProps } from '@/components/GlideSelect';

/** The one select of the app (GlideSelect) in the dashboard's colours. Use it for every choose-one-of-a-list control. */
export function Select(props: GlideSelectProps) {
  return (
    <GlideSelect
      surfaceColor="#17213a" highlightColor="#26334f" textColor="#e8eefc" accentColor="#4FB6A8"
      radius={12} showTags={false} {...props}
    />
  );
}
