'use client';
import { useMemo, useState } from 'react';
import { isManualMetric, limitsFor, manualEntries, type Status } from '@astro/engine';
import { formatMetShort } from '@/components/selfcheck/time';
import { Segmented } from '@/components/ui/segmented';
import { baseCfg } from '@/lib/engineConfig';
import { statusWord, useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { formatMet, METRICS, STATUS_COLOR } from '@/lib/metrics';
import { chartDomain, limitBands, sampleSeries, type Level, type SeriesPoint } from '@/lib/metricSeries';
import { useMissionStore } from '@/lib/store/missionStore';

const W = 440;
const H = 176;
const M = { l: 42, r: 10, t: 10, b: 22 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const LEVEL_STATUS: Record<Level, Status> = { caution: 'CAUTION', warning: 'WARNING', critical: 'CRITICAL' };
const LEVELS: Level[] = ['critical', 'warning', 'caution']; // outermost first, so the milder band paints over it

type Period = '300' | '1800' | 'all';
/** Blood pressure is two lines; every other indicator is one. */
const SERIES_OF: Record<string, string[]> = { bp: ['bpSys', 'bpDia'] };
/** Metrics whose limits change while exercising (so the bands are the resting ones). */
const HAS_EXERCISE = new Set(Object.keys(baseCfg.thresholds.exercise ?? {}));

const nice = (v: number, decimals: number) => v.toFixed(decimals);
/** Short windows get seconds ("12:05:10"), long ones the day and minutes ("3d 12:05"). */
const clock = (tt: number, span: number) => (span < 1200 ? formatMet(tt).slice(4) : formatMetShort(tt));

/**
 * A metric over time for the selected crew member, from the same deterministic frames as the cards, with the limits
 * drawn as bands (caution, warning, critical) so you can see how near the reading is. Hover or touch for a value.
 * Entries you made by hand (glucose, sleep, mood) are drawn as points. Water has no chart: it is a running total.
 */
export function TrendChart({ metric }: { metric: string }) {
  const t = useT();
  const crewId = useMissionStore((s) => s.selectedCrewId);
  const events = useMissionStore((s) => s.events);
  const startT = useMissionStore((s) => s.startT);
  const now = useMissionStore((s) => s.t);
  const [period, setPeriod] = useState<Period>('300');
  const [hover, setHover] = useState<number | null>(null);

  const manual = isManualMetric(metric);
  const keys = SERIES_OF[metric] ?? [metric];
  const decimals = METRICS[keys[0]]?.decimals ?? (manual ? 1 : 1);
  const unit = METRICS[keys[0]]?.unit ?? '';
  const th = limitsFor(baseCfg.thresholds, keys[0], false);
  const bands = useMemo(() => limitBands(th), [th]);

  const bucket = Math.floor(now / 10);
  const { series, from, to } = useMemo(() => {
    const toT = bucket * 10 + 9.9;
    if (manual) {
      const entries = manualEntries(events, { crewId, toT }).filter((e) => e.metric === metric);
      const f = Math.min(entries[0]?.t ?? toT - 600, toT - 600);
      return { series: [{ metric, points: entries.map((e) => ({ t: e.t, v: e.value })) }], from: f, to: toT };
    }
    const f = period === 'all' ? Math.max(0, startT) : Math.max(startT, toT - Number(period));
    if (toT - f < 20) return { series: [], from: f, to: toT };
    return { series: sampleSeries({ ...baseCfg, log: events }, crewId, keys, f, toT, 120), from: f, to: toT };
  }, [events, crewId, metric, manual, period, startT, bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  if (metric === 'hydration') return null;
  const all = series.flatMap((s) => s.points);
  const empty = all.length === 0;
  const [lo, hi] = chartDomain(all.map((p) => p.v), bands);
  const x = (tt: number) => M.l + ((tt - from) / Math.max(1, to - from)) * PW;
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * PH;
  const path = (pts: SeriesPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');

  // value axis: three round-ish ticks
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];

  const main = series[0]?.points ?? [];
  const hv = hover !== null ? main[Math.min(main.length - 1, Math.max(0, hover))] : undefined;
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (main.length === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < main.length; i++) if (Math.abs(x(main[i].t) - px) < Math.abs(x(main[best].t) - px)) best = i;
    setHover(best);
  };

  const mins = Math.min(...all.map((p) => p.v));
  const maxs = Math.max(...all.map((p) => p.v));
  const last = main[main.length - 1];
  const summary = empty ? '' : t('trend.sum', { lo: nice(mins, decimals), hi: nice(maxs, decimals), unit, now: last ? nice(last.v, decimals) : '—' });
  const periodItems: Array<{ value: Period; key: DictKey }> = [{ value: '300', key: 'trend.p300' }, { value: '1800', key: 'trend.p1800' }, { value: 'all', key: 'trend.all' }];

  return (
    <section aria-label={t('trend.title')} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('trend.title')}</h3>
        {!manual && (
          <Segmented
            items={periodItems.map((p) => ({ value: p.value, label: <span className="px-0.5 text-xs">{t(p.key)}</span> }))}
            value={period} onChange={(v) => setPeriod(v as Period)} size="sm" label={t('trend.label')}
          />
        )}
      </div>

      {empty ? (
        <p className="rounded-2xl bg-cell px-3.5 py-6 text-center text-xs text-muted-foreground">{t(manual ? 'trend.noneManual' : 'trend.none')}</p>
      ) : (
        <div className="rounded-2xl bg-cell p-2">
          <svg
            viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none select-none" role="img"
            aria-label={`${t('trend.title')}: ${summary}`}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)}
          >
            {/* limit bands, outermost first */}
            {th && LEVELS.map((lv) => bands.filter((b) => b.level === lv).map((b) => {
              const yy = Math.min(M.t + PH, Math.max(M.t, y(b.value)));
              const top = b.side === 'high' ? M.t : yy;
              const h = b.side === 'high' ? yy - M.t : M.t + PH - yy;
              return h > 0 ? <rect key={`${lv}${b.side}`} x={M.l} y={top} width={PW} height={h} fill={STATUS_COLOR[LEVEL_STATUS[lv]]} fillOpacity={lv === 'critical' ? 0.2 : lv === 'warning' ? 0.15 : 0.1} /> : null;
            }))}
            {th && bands.map((b) => (b.value > lo && b.value < hi ? (
              <g key={`l${b.level}${b.side}`}>
                <line x1={M.l} x2={M.l + PW} y1={y(b.value)} y2={y(b.value)} stroke={STATUS_COLOR[LEVEL_STATUS[b.level]]} strokeOpacity={0.7} strokeDasharray="3 3" />
                <text x={M.l + PW - 3} y={y(b.value) + (b.side === 'high' ? 10 : -3)} textAnchor="end" fontSize="9" fill={STATUS_COLOR[LEVEL_STATUS[b.level]]}>
                  {statusWord(LEVEL_STATUS[b.level])} {nice(b.value, decimals)}
                </text>
              </g>
            ) : null))}

            {/* value axis */}
            {ticks.map((v) => (
              <g key={v}>
                <line x1={M.l - 3} x2={M.l} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.4} />
                <text x={M.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.7} className="num">{nice(v, decimals)}</text>
              </g>
            ))}
            <text x={M.l} y={H - 5} fontSize="10" fill="currentColor" fillOpacity={0.7} className="num">{clock(from, to - from)}</text>
            <text x={M.l + PW} y={H - 5} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity={0.7} className="num">{clock(to, to - from)}</text>

            {/* the data */}
            {series.map((s, i) => (manual ? (
              <g key={s.metric}>
                <path d={path(s.points)} fill="none" stroke="var(--color-teal)" strokeWidth={1.5} strokeOpacity={0.6} />
                {s.points.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={3.5} fill="var(--color-teal)" />)}
              </g>
            ) : (
              <path key={s.metric} d={path(s.points)} fill="none" stroke="var(--color-teal)" strokeWidth={i === 0 ? 2 : 1.5} strokeDasharray={i === 0 ? undefined : '5 3'} strokeLinejoin="round" />
            )))}
            {!manual && last && <circle cx={x(last.t)} cy={y(last.v)} r={3.5} fill="var(--color-teal)" />}

            {hv && (
              <g pointerEvents="none">
                <line x1={x(hv.t)} x2={x(hv.t)} y1={M.t} y2={M.t + PH} stroke="currentColor" strokeOpacity={0.5} />
                <circle cx={x(hv.t)} cy={y(hv.v)} r={4} fill="var(--color-bone)" />
                <g transform={`translate(${Math.min(Math.max(x(hv.t) - 52, M.l), M.l + PW - 104)} ${M.t + 2})`}>
                  <rect width="104" height="30" rx="6" fill="var(--color-panel-2)" stroke="currentColor" strokeOpacity={0.25} />
                  <text x="52" y="13" textAnchor="middle" fontSize="11" fill="var(--color-bone)" className="num">{formatValue(keys[0], hv.v, unit) || `${nice(hv.v, decimals)} ${unit}`}</text>
                  <text x="52" y="25" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity={0.7} className="num">{clock(hv.t, to - from)}</text>
                </g>
              </g>
            )}
          </svg>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1.5 pt-1 text-[11px] text-muted-foreground">
            <span className="num">{summary}</span>
            {keys.length > 1 && <span>{t('trend.sys')} <span className="text-teal">━</span> · {t('trend.dia')} <span className="text-teal">╍</span></span>}
          </div>
          {!manual && HAS_EXERCISE.has(keys[0]) && <p className="px-1.5 pt-0.5 text-[11px] leading-snug text-muted-foreground">{t('trend.rest')}</p>}
        </div>
      )}
    </section>
  );
}
