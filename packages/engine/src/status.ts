import {
  STATUS_ORDER, type Alert, type LevelSet, type MetricThreshold, type Status, type TelemetryFrame, type Thresholds,
} from './schemas';

const rank = (s: Status) => STATUS_ORDER.indexOf(s);
export const worstStatus = (list: Status[]): Status =>
  list.reduce<Status>((w, s) => (rank(s) > rank(w) ? s : w), 'NOMINAL');

function levelOf(value: number, th: MetricThreshold, shift: number): Status {
  let out: Status = 'NOMINAL';
  const check = (set: LevelSet | undefined, hit: (limit: number) => boolean) => {
    if (!set) return;
    if (hit(set.caution) && rank(out) < 1) out = 'CAUTION';
    if (hit(set.warning) && rank(out) < 2) out = 'WARNING';
    if (hit(set.critical) && rank(out) < 3) out = 'CRITICAL';
  };
  check(th.high, (l) => value >= l - shift);
  check(th.low, (l) => value <= l + shift);
  return out;
}

/** Escalates immediately; releases a status only once the value is `hysteresis` past the limit. */
export function evaluateMetric(value: number, th: MetricThreshold, prev: Status = 'NOMINAL'): Status {
  const raw = levelOf(value, th, 0);
  if (rank(raw) >= rank(prev)) return raw;
  const held = levelOf(value, th, th.hysteresis);
  return rank(held) < rank(prev) ? held : prev;
}

export function metricValues(f: TelemetryFrame): Record<string, number> {
  return {
    ...f.vitals,
    co2: f.cabin.co2,
    o2: f.cabin.o2,
    humidity: f.cabin.humidity,
    noise: f.cabin.noise,
    airflow: f.cabin.airflow,
    doseRate: f.radiation.doseRateUSvH,
    dose: f.radiation.cumulativeMSv,
  };
}

/** The limits in force for a metric: exercise levels replace the resting ones while `exercise` is on. */
export function limitsFor(th: Thresholds, metric: string, exercise: boolean | undefined): MetricThreshold | undefined {
  const base = th.metrics[metric];
  const ex = exercise ? th.exercise?.[metric] : undefined;
  if (!base || !ex) return base;
  return { ...base, ...(ex.high ? { high: ex.high } : {}), ...(ex.low ? { low: ex.low } : {}) };
}

export function applyStatus(frame: TelemetryFrame, th: Thresholds, prev?: Record<string, Status>): TelemetryFrame {
  const byMetric: Record<string, Status> = {};
  for (const [metric, value] of Object.entries(metricValues(frame))) {
    const t = limitsFor(th, metric, frame.exercise);
    if (t && Number.isFinite(value)) byMetric[metric] = evaluateMetric(value, t, prev?.[metric]);
  }
  return { ...frame, status: { overall: worstStatus(Object.values(byMetric)), byMetric } };
}

/** One alert per metric whose status got worse between two frames. */
export function diffAlerts(prev: TelemetryFrame | undefined, next: TelemetryFrame, th: Thresholds): Alert[] {
  const values = metricValues(next);
  const alerts: Alert[] = [];
  for (const [metric, status] of Object.entries(next.status.byMetric)) {
    const before = prev?.status.byMetric[metric] ?? 'NOMINAL';
    if (rank(status) <= rank(before) || status === 'NOMINAL') continue;
    const unit = th.metrics[metric]?.unit ?? '';
    alerts.push({
      id: `${next.crewId}:${metric}:${Math.round(next.t)}:${status}`,
      t: next.t,
      crewId: next.crewId,
      metric,
      severity: status,
      message: `${metric} ${status.toLowerCase()} (${Number(values[metric]).toFixed(1)} ${unit})`,
      value: values[metric],
      unit,
    });
  }
  return alerts;
}
