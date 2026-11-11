'use client';
import { useMemo } from 'react';
import { limitsFor, timeToThreshold, type Eta, type Status, type TelemetryFrame } from '@astro/engine';
import { baseCfg } from '@/lib/engineConfig';
import { frameBuffers } from '@/lib/telemetryBus';

/**
 * "When will this reading reach the next limit?" from the last ~50 s of frames.
 * Aims at WARNING while the reading is normal or on caution, and at CRITICAL once it is already a warning.
 * Nothing is shown for a critical reading, a flat or noisy trend, or while replaying history.
 */
export function useEta(
  crewId: string, metric: string, read: (f: TelemetryFrame) => number, status: Status, tick: number, enabled: boolean,
): Eta | null {
  return useMemo(() => {
    const frames = frameBuffers[crewId]?.toArray() ?? [];
    const th = limitsFor(baseCfg.thresholds, metric, frames[frames.length - 1]?.exercise);
    if (!enabled || !th || status === 'CRITICAL') return null;
    if (frames.length < 60) return null;
    const points = frames.filter((_, i) => i % 5 === 0).map((f) => ({ t: f.t, v: read(f) })).filter((p) => Number.isFinite(p.v));
    return timeToThreshold(points, th, status === 'WARNING' ? 'critical' : 'warning');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId, metric, status, enabled, Math.floor(tick)]);
}
