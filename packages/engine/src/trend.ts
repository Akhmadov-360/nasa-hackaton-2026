import type { MetricThreshold } from './schemas';

export interface TrendPoint {
  t: number;
  v: number;
}
export interface Eta {
  /** seconds until the fitted line reaches the threshold */
  etaSec: number;
  slopePerMin: number;
  level: 'warning' | 'critical';
}

const MIN_POINTS = 20;
const MIN_R2 = 0.7;
/** Further out than this a straight line through a short window is a guess, and slow environmental drift looks like a trend. */
const MAX_ETA_SEC = 180;
/** The reading must have moved at least this many hysteresis widths across the fitted window to count as a trend. */
const MIN_MOVE_IN_HYSTERESES = 2;

/** Least-squares line through the points (time in seconds). Null when the data has no variation to fit. */
export function linearFit(points: TrendPoint[]): { slope: number; fittedLast: number; r2: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const t0 = points[n - 1].t;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) {
    const x = p.t - t0;
    sx += x; sy += p.v; sxx += x * x; sxy += x * p.v;
  }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n; // value at x = 0, i.e. the latest moment
  const mean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const fit = intercept + slope * (p.t - t0);
    ssTot += (p.v - mean) ** 2;
    ssRes += (p.v - fit) ** 2;
  }
  if (ssTot === 0) return null;
  return { slope, fittedLast: intercept, r2: 1 - ssRes / ssTot };
}

/**
 * When will a steadily drifting value reach the warning or critical limit?
 * Returns null unless the trend is clear (enough points, a good straight-line fit, a meaningful slope),
 * has moved clearly across the window (slow drift is not a trend), heads towards the limit, has not crossed it yet,
 * and would arrive within three minutes (further out, a straight line says too little to be useful).
 */
export function timeToThreshold(points: TrendPoint[], th: MetricThreshold, target: 'warning' | 'critical'): Eta | null {
  if (points.length < MIN_POINTS) return null;
  const fit = linearFit(points);
  if (!fit || fit.r2 < MIN_R2) return null;
  const perMin = fit.slope * 60;
  if (Math.abs(perMin) < Math.max(th.hysteresis * 0.3, 1e-6)) return null;
  const span = points[points.length - 1].t - points[0].t;
  if (Math.abs(fit.slope) * span < th.hysteresis * MIN_MOVE_IN_HYSTERESES) return null;

  const candidates: number[] = [];
  const low = th.low?.[target];
  const high = th.high?.[target];
  if (low !== undefined && fit.slope < 0 && fit.fittedLast > low) candidates.push((fit.fittedLast - low) / -fit.slope);
  if (high !== undefined && fit.slope > 0 && fit.fittedLast < high) candidates.push((high - fit.fittedLast) / fit.slope);
  if (!candidates.length) return null;
  const etaSec = Math.min(...candidates);
  if (!Number.isFinite(etaSec) || etaSec > MAX_ETA_SEC) return null;
  return { etaSec, slopePerMin: perMin, level: target };
}
