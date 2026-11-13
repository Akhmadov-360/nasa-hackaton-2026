import { limitsFor, metricValues, timeToThreshold, type Eta } from '@astro/engine';
import { baseCfg } from './engineConfig';
import { frameBuffers } from './telemetryBus';

export interface Forecast extends Eta {
  crewId: string;
  metric: string;
}

const cache = new Map<string, { k: number; v: Forecast[] }>();

/**
 * Every "reaches the next limit in ..." forecast for one crew member, nearest first.
 * Computed once per second per crew and shared by the card pills and the status island, so several
 * readings can be forecast at the same time without repeating the work.
 */
export function forecastsFor(crewId: string, tick: number): Forecast[] {
  const k = Math.floor(tick);
  const hit = cache.get(crewId);
  if (hit && hit.k === k) return hit.v;

  const frames = frameBuffers[crewId]?.toArray() ?? [];
  const out: Forecast[] = [];
  if (frames.length >= 60) {
    const last = frames[frames.length - 1];
    const series: Record<string, Array<{ t: number; v: number }>> = {};
    for (let i = 0; i < frames.length; i += 5) {
      for (const [metric, v] of Object.entries(metricValues(frames[i]))) {
        if (Number.isFinite(v)) (series[metric] ??= []).push({ t: frames[i].t, v });
      }
    }
    for (const [metric, points] of Object.entries(series)) {
      const status = last.status.byMetric[metric];
      if (!status || status === 'CRITICAL') continue;
      const th = limitsFor(baseCfg.thresholds, metric, last.exercise);
      if (!th) continue;
      const eta = timeToThreshold(points, th, status === 'WARNING' ? 'critical' : 'warning');
      if (eta) out.push({ ...eta, crewId, metric });
    }
    out.sort((a, b) => a.etaSec - b.etaSec);
  }
  cache.set(crewId, { k, v: out });
  return out;
}
