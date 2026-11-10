import { z } from 'zod';
import { computeFrame, type EngineConfig } from './frame';
import { metricValues } from './status';
import { STATUS_ORDER, type Status } from './schemas';

/* ---------------------------------------------------------------------------------------------
 * Mission medical report: a deterministic summary of a period, computed from the engine and the event log.
 * The zod schemas double as the validator for imported telemetry packages, so the shape lives in one place.
 * ------------------------------------------------------------------------------------------- */

const StatusZ = z.enum(['NOMINAL', 'CAUTION', 'WARNING', 'CRITICAL']);
const num = z.number().finite();
const short = z.string().max(120);

export const ReportEventSchema = z.object({
  t: num,
  type: z.enum(['flare', 'exertion', 'o2fault', 'normalize']),
  crewId: short,
  params: z.record(short, z.union([num, short])).optional(),
});

export const EpisodeSchema = z.object({
  metric: short,
  severity: StatusZ,
  startT: num,
  endT: num,
  /** the reading furthest into the abnormal range during the episode */
  peak: num,
  unit: short,
});

export const IncidentSchema = z.object({
  id: short,
  crewId: short,
  startT: num,
  endT: num,
  durationSec: num,
  worst: StatusZ,
  primaryMetric: short,
  metrics: z.array(short).max(20),
  episodes: z.array(EpisodeSchema).max(60),
  causes: z.array(ReportEventSchema).max(20),
  /** protocol id, see packages/data/protocols.json */
  protocol: short,
});

export const MetricStatsSchema = z.object({ min: num, mean: num, max: num, unit: short });

export const CrewReportSchema = z.object({
  crewId: short,
  worst: StatusZ,
  stats: z.record(short, MetricStatsSchema),
  radiation: z.object({ startMSv: num, endMSv: num, deltaMSv: num, peakRateUSvH: num }),
  incidents: z.array(IncidentSchema).max(200),
});

export const MissionReportSchema = z.object({
  version: z.literal(1),
  fromT: num,
  toT: num,
  generatedAtT: num,
  /** true while thresholds/models are illustrative */
  provisional: z.boolean(),
  sources: z.array(z.string().max(300)).max(20),
  crew: z.array(CrewReportSchema).max(16),
  events: z.array(ReportEventSchema).max(500),
});

export type ReportEvent = z.infer<typeof ReportEventSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type CrewReport = z.infer<typeof CrewReportSchema>;
export type MissionReport = z.infer<typeof MissionReportSchema>;

export interface ReportOptions {
  fromT: number;
  toT: number;
  maxSamples?: number;
  generatedAtT?: number;
}

/** Which illustrative protocol answers an abnormal reading. */
export const PROTOCOL_OF_METRIC: Record<string, string> = {
  spo2: 'hypoxia', o2: 'hypoxia', respRate: 'hypoxia',
  co2: 'co2',
  hr: 'cardio', hrv: 'cardio', bpSys: 'cardio', bpDia: 'cardio',
  temp: 'thermal',
  stress: 'exertion',
  doseRate: 'radiation', dose: 'radiation',
};

const rank = (s: Status) => STATUS_ORDER.indexOf(s);
/** When several metrics are equally severe, the body comes first and the environment last. */
const METRIC_PRIORITY = ['spo2', 'hr', 'hrv', 'bpSys', 'bpDia', 'respRate', 'temp', 'stress', 'co2', 'o2', 'doseRate', 'dose'];
const priority = (m: string) => { const i = METRIC_PRIORITY.indexOf(m); return i < 0 ? METRIC_PRIORITY.length : i; };
const MERGE_GAP_SEC = 120;
const CAUSE_LOOKBACK_SEC = 180;
const REPORTED = ['hr', 'hrv', 'spo2', 'bpSys', 'bpDia', 'respRate', 'temp', 'stress', 'co2', 'o2', 'doseRate'];

interface Open {
  metric: string;
  severity: Status;
  startT: number;
  endT: number;
  peak: number;
  side: 'low' | 'high';
}

export function buildReport(cfg: EngineConfig, opts: ReportOptions): MissionReport {
  const { fromT, toT } = opts;
  const span = Math.max(1, toT - fromT);
  const n = Math.max(2, Math.min(opts.maxSamples ?? 480, Math.ceil(span)));
  const step = span / n;
  const events = [...cfg.pack.events, ...cfg.log].filter((e) => e.t <= toT);

  const crew: CrewReport[] = cfg.pack.crew.map((member) => {
    const id = member.id;
    const sums: Record<string, { min: number; max: number; total: number; count: number }> = {};
    const episodes: Episode[] = [];
    const open: Record<string, Open> = {};
    let prev: Record<string, Status> | undefined;
    let radStart = 0, radEnd = 0, peakRate = 0;

    const close = (metric: string, at: number) => {
      const o = open[metric];
      if (!o) return;
      episodes.push({ metric, severity: o.severity, startT: o.startT, endT: Math.max(o.endT, at), peak: o.peak, unit: cfg.thresholds.metrics[metric]?.unit ?? '' });
      delete open[metric];
    };

    for (let i = 0; i <= n; i++) {
      const t = fromT + i * step;
      const f = computeFrame(cfg, id, t, prev);
      prev = f.status.byMetric;
      if (i === 0) radStart = f.radiation.cumulativeMSv;
      radEnd = f.radiation.cumulativeMSv;
      peakRate = Math.max(peakRate, f.radiation.doseRateUSvH);
      const values = metricValues(f);
      for (const m of REPORTED) {
        const v = values[m];
        if (!Number.isFinite(v)) continue;
        const s = (sums[m] ??= { min: v, max: v, total: 0, count: 0 });
        s.min = Math.min(s.min, v); s.max = Math.max(s.max, v); s.total += v; s.count++;
      }
      for (const [metric, status] of Object.entries(f.status.byMetric)) {
        const th = cfg.thresholds.metrics[metric];
        const v = values[metric];
        if (rank(status) >= rank('WARNING') && th && Number.isFinite(v)) {
          const side: 'low' | 'high' = th.low && v <= th.low.caution ? 'low' : 'high';
          const o = open[metric];
          if (!o) open[metric] = { metric, severity: status, startT: t, endT: t, peak: v, side };
          else {
            o.endT = t;
            if (rank(status) > rank(o.severity)) o.severity = status;
            o.peak = o.side === 'low' ? Math.min(o.peak, v) : Math.max(o.peak, v);
          }
        } else close(metric, t);
      }
    }
    for (const metric of Object.keys(open)) close(metric, toT);

    // merge episodes of different metrics that overlap (or nearly) into one incident
    episodes.sort((a, b) => a.startT - b.startT);
    const groups: Episode[][] = [];
    for (const ep of episodes) {
      const g = groups[groups.length - 1];
      if (g && ep.startT <= Math.max(...g.map((e) => e.endT)) + MERGE_GAP_SEC) g.push(ep);
      else groups.push([ep]);
    }
    const incidents: Incident[] = groups.map((g, i) => {
      const startT = Math.min(...g.map((e) => e.startT));
      const endT = Math.max(...g.map((e) => e.endT));
      const primary = [...g].sort((a, b) => rank(b.severity) - rank(a.severity) || priority(a.metric) - priority(b.metric) || a.startT - b.startT)[0];
      const causes = events
        .filter((e) => e.type !== 'normalize' && (e.crewId === id || e.crewId === 'ALL') && e.t >= startT - CAUSE_LOOKBACK_SEC && e.t <= endT)
        .map((e) => ({ t: e.t, type: e.type, crewId: e.crewId, ...(e.params ? { params: e.params } : {}) }));
      const protocol = causes.some((c) => c.type === 'flare') && ['doseRate', 'dose'].includes(primary.metric)
        ? 'radiation'
        : PROTOCOL_OF_METRIC[primary.metric] ?? 'general';
      return {
        id: `${id}-${i + 1}`, crewId: id, startT, endT, durationSec: endT - startT,
        worst: g.reduce<Status>((w, e) => (rank(e.severity) > rank(w) ? e.severity : w), 'NOMINAL'),
        primaryMetric: primary.metric,
        metrics: [...new Set(g.map((e) => e.metric))],
        episodes: g.slice(0, 60), causes: causes.slice(0, 20), protocol,
      };
    });

    const stats: CrewReport['stats'] = {};
    for (const [m, s] of Object.entries(sums)) {
      stats[m] = { min: s.min, max: s.max, mean: s.total / s.count, unit: cfg.thresholds.metrics[m === 'doseRate' ? 'doseRate' : m]?.unit ?? '' };
    }
    return {
      crewId: id,
      worst: incidents.reduce<Status>((w, inc) => (rank(inc.worst) > rank(w) ? inc.worst : w), 'NOMINAL'),
      stats,
      radiation: { startMSv: radStart, endMSv: radEnd, deltaMSv: radEnd - radStart, peakRateUSvH: peakRate },
      incidents,
    };
  });

  return {
    version: 1,
    fromT,
    toT,
    generatedAtT: opts.generatedAtT ?? toT,
    provisional: !!cfg.thresholds.provisional,
    sources: cfg.pack.meta.sources.slice(0, 20),
    crew,
    events: events.map((e) => ({ t: e.t, type: e.type, crewId: e.crewId, ...(e.params ? { params: e.params } : {}) })).slice(-500),
  };
}
