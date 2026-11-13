import { limitsFor } from '@astro/engine';
import { baseCfg } from './engineConfig';

/**
 * The normal range shown beside a reading: between the first "caution" limits of the limits in force
 * (resting or exercise). One-sided metrics show "> x" or "< x". Undefined when the metric has no limits.
 */
export function normText(metric: string, exercise?: boolean): string | undefined {
  const th = limitsFor(baseCfg.thresholds, metric, exercise);
  if (!th) return undefined;
  const lo = th.low?.caution;
  const hi = th.high?.caution;
  if (lo !== undefined && hi !== undefined) return `${lo}–${hi}`;
  if (hi !== undefined) return `< ${hi}`;
  if (lo !== undefined) return `> ${lo}`;
  return undefined;
}

/** "mm:ss" for a forecast countdown. */
export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
