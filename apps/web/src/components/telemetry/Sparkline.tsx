'use client';
import { useMemo } from 'react';
import { frameBuffers } from '@/lib/telemetryBus';

interface Props {
  crewId: string;
  read: (f: import('@astro/engine').TelemetryFrame) => number;
  color: string;
  /** changes whenever new data arrived, so the memo recomputes */
  tick: number;
  points?: number;
}

/** Tiny SVG trend line over the last N ticks, read from the ring buffer. */
export function Sparkline({ crewId, read, color, tick, points = 60 }: Props) {
  const d = useMemo(() => {
    const all = frameBuffers[crewId]?.toArray() ?? [];
    const vals = all.slice(-points).map(read).filter(Number.isFinite);
    if (vals.length < 2) return '';
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const span = mx - mn || 1;
    return vals
      .map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * 100).toFixed(1)} ${(26 - ((v - mn) / span) * 22 - 2).toFixed(1)}`)
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, tick, points]);
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="h-6 w-full" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
