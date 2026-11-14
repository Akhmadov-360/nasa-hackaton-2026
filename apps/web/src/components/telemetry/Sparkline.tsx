'use client';
import { useMemo } from 'react';
import { replayFrames } from '@/lib/replaySeries';
import { useMissionStore } from '@/lib/store/missionStore';
import { frameBuffers } from '@/lib/telemetryBus';

interface Props {
  crewId: string;
  read: (f: import('@astro/engine').TelemetryFrame) => number;
  color: string;
  /** changes whenever new data arrived, so the memo recomputes */
  tick: number;
  points?: number;
  className?: string;
}

/** Frames per second of the live stream: the replay window is as long as the live one (`points` ticks). */
const TICKS_PER_SEC = 10;

/**
 * Tiny SVG trend line over the last N ticks, read from the ring buffer. While a replay runs it shows the same window
 * ending at the replay cursor, rebuilt from the engine, so it agrees with the number beside it.
 */
export function Sparkline({ crewId, read, color, tick, points = 60, className = 'h-9' }: Props) {
  const cursor = useMissionStore((s) => s.timeTravelT);
  const events = useMissionStore((s) => s.events);
  const step = cursor === null ? null : Math.floor(cursor * 5); // the cursor on the 0.2 s grid
  const d = useMemo(() => {
    const all = cursor === null ? (frameBuffers[crewId]?.toArray() ?? []).slice(-points) : replayFrames(events, crewId, cursor, points / TICKS_PER_SEC);
    const vals = all.map(read).filter(Number.isFinite);
    if (vals.length < 2) return '';
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const span = mx - mn || 1;
    return vals
      .map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * 100).toFixed(1)} ${(26 - ((v - mn) / span) * 22 - 2).toFixed(1)}`)
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, cursor === null ? tick : step, cursor === null, events, points]);
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className={`${className} w-full`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}
