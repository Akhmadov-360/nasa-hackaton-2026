import { computeFrame, metricValues, type EngineConfig, type MetricThreshold } from '@astro/engine';

export interface SeriesPoint { t: number; v: number }
export interface Series { metric: string; points: SeriesPoint[] }

/**
 * A metric over a period, sampled from the engine at evenly spaced mission times (`n` + 1 points). It reads the same
 * deterministic frames as the cards, so the chart and the cards can never disagree. Pure; no React.
 */
export function sampleSeries(cfg: EngineConfig, crewId: string, metrics: string[], fromT: number, toT: number, n = 120): Series[] {
  const out: Series[] = metrics.map((metric) => ({ metric, points: [] }));
  const span = Math.max(0, toT - fromT);
  for (let i = 0; i <= n; i++) {
    const t = fromT + (span * i) / n;
    const values = metricValues(computeFrame(cfg, crewId, t));
    out.forEach((s) => {
      const v = values[s.metric];
      if (Number.isFinite(v)) s.points.push({ t, v });
    });
  }
  return out;
}

export type Level = 'caution' | 'warning' | 'critical';
export interface Band { level: Level; side: 'high' | 'low'; value: number }

/** The limits of a metric as lines to draw, from the first caution outwards. */
export function limitBands(th: MetricThreshold | undefined): Band[] {
  if (!th) return [];
  const out: Band[] = [];
  for (const side of ['low', 'high'] as const) {
    const set = th[side];
    if (!set) continue;
    for (const level of ['caution', 'warning', 'critical'] as const) out.push({ level, side, value: set[level] });
  }
  return out;
}

/**
 * The value axis: the data, always the nearest caution limit on each side (so the normal zone is visible), and the
 * warning and critical limits only when they are near enough not to squash the data. A little padding all round.
 */
export function chartDomain(values: number[], bands: Band[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 1];
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  for (const b of bands) if (b.level === 'caution') { lo = Math.min(lo, b.value); hi = Math.max(hi, b.value); }
  const base = Math.max(hi - lo, 1e-9);
  for (const b of bands) {
    if (b.level === 'caution') continue;
    if (b.value >= lo - 0.35 * base && b.value <= hi + 0.35 * base) { lo = Math.min(lo, b.value); hi = Math.max(hi, b.value); }
  }
  const pad = Math.max((hi - lo) * 0.08, 1e-9);
  return [lo - pad, hi + pad];
}
