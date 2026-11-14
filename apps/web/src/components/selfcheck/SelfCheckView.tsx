'use client';
import { useMemo } from 'react';
import { ChevronRight, ClipboardPen } from 'lucide-react';
import type { ManualMetric, TelemetryFrame } from '@astro/engine';
import { MANUAL, MANUAL_KEYS, manualEntries } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { ProvenanceMark } from '@/components/telemetry/VitalCard';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import { baseCfg } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatValue } from '@/lib/logText';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { normText } from '@/lib/norms';
import { useMissionStore } from '@/lib/store/missionStore';
import { moodFace } from './mood';

/** Reference only, not an alarm: the water supplied per crew member per day (NASA-STD-3001, OCHMO water brief). */
export const WATER_SUPPLY_L = 2.5;

/** "2 h 10 min", "35 min", "just now" */
export function ageText(sec: number, t: (k: DictKey, p?: Record<string, string | number>) => string): string {
  if (sec < 60) return t('selfcheck.justNow');
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return t('selfcheck.ago', { time: h > 0 ? `${h} h ${m % 60} min` : `${m} min` });
}

function Card({ metric, frame, crewId }: { metric: ManualMetric; frame: TelemetryFrame | undefined; crewId: string }) {
  const t = useT();
  const openMetric = useMissionStore((s) => s.openMetric);
  const openSelfCheck = useMissionStore((s) => s.openSelfCheck);
  // an entry that has expired is "due", one that was never made is "not entered": told apart through the event log
  const events = useMissionStore((s) => s.events);
  const everEntered = useMemo(() => manualEntries(events, { crewId, toT: frame?.t ?? 0 }).some((e) => e.metric === metric), [events, crewId, metric, frame?.t]);
  const entry = frame?.manual?.[metric];
  const status = frame?.status.byMetric[metric] ?? 'NOMINAL';
  const color = STATUS_COLOR[status];
  const alert = STATUS_RANK[status] >= STATUS_RANK.WARNING;
  const label = t(`metric.${metric}` as DictKey);
  const norm = metric === 'hydration' ? `≥ ${WATER_SUPPLY_L}` : normText(metric);
  const limits = baseCfg.thresholds.metrics[metric];

  return (
    <article
      onClick={() => openMetric(metric)}
      className="group @container relative flex min-w-0 cursor-pointer flex-col gap-1 bg-cell p-3.5 transition-[box-shadow,background-color] duration-200 hover:bg-[color-mix(in_srgb,white_4%,var(--color-cell))]"
      style={{
        background: alert ? `color-mix(in srgb, ${color} 9%, var(--color-cell))` : undefined,
        boxShadow: alert ? `inset 3px 0 0 ${color}` : undefined,
      }}
    >
      <header className="flex items-center justify-between gap-1 text-[13px] text-muted-foreground">
        <Tip label={t('about.open', { name: label })}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openMetric(metric); }}
          aria-label={t('about.open', { name: label })}
          className="-mx-1 flex min-w-0 cursor-pointer items-center gap-1.5 truncate rounded-md px-1 text-left transition-colors group-hover:text-bone focus-visible:text-bone"
        >
          <span className="truncate">{label}</span>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-bone" aria-hidden />
        </button>
        </Tip>
        <span className="flex shrink-0 items-center gap-1">
          {status !== 'NOMINAL' && <StatusBadge status={status} />}
          <ProvenanceMark sourceKey={metric} limitKey={limits ? metric : undefined} />
        </span>
      </header>

      <div className="flex items-baseline gap-1.5">
        {entry ? (
          <span className="num flex items-center gap-1.5 text-[1.55rem] leading-[1.3] font-medium">
            {metric === 'mood' && (() => { const f = moodFace(entry.value); return <f.Icon className="size-6" style={{ color: f.color }} aria-hidden />; })()}
            {formatValue(metric, entry.value).replace(/ .*$/, '')}
          </span>
        ) : (
          <span className="num text-[1.55rem] leading-[1.3] font-medium text-muted-foreground/60">—</span>
        )}
        <span className="text-xs text-muted-foreground">{MANUAL[metric].unit}</span>
        {norm && <Tip label={`${t('norm.label')}: ${norm}`}><span className="num ml-auto hidden text-[11px] whitespace-nowrap text-muted-foreground/80 @[8.5rem]:inline">{norm}</span></Tip>}
      </div>

      {metric === 'hydration' && (
        <div
          className="mt-1 h-1.5 rounded-full bg-white/8" role="meter" aria-valuemin={0} aria-valuemax={WATER_SUPPLY_L}
          aria-valuenow={Math.min(entry?.value ?? 0, WATER_SUPPLY_L)} aria-label={t('selfcheck.total')}
        >
          <div className="h-full rounded-full bg-teal transition-[width] duration-500" style={{ width: `${Math.min(100, ((entry?.value ?? 0) / WATER_SUPPLY_L) * 100)}%` }} />
        </div>
      )}
      {metric === 'mood' && entry && <p className="text-xs text-muted-foreground">{t(`selfcheck.mood.${entry.value}` as DictKey)}</p>}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className={`text-xs ${entry ? 'text-muted-foreground' : everEntered ? 'text-amber' : 'text-muted-foreground/70'}`}>
          {entry ? (metric === 'hydration' ? t('selfcheck.total') : ageText((frame?.t ?? 0) - entry.t, t)) : everEntered ? t('selfcheck.due') : t('selfcheck.never')}
        </span>
        <Button
          type="button" variant="secondary" size="sm" className="h-8 rounded-full px-3"
          onClick={(e) => { e.stopPropagation(); openSelfCheck(metric); }}
          aria-label={t('selfcheck.recordFor', { name: label })}
        >
          <ClipboardPen aria-hidden /> {t('selfcheck.record')}
        </Button>
      </div>
    </article>
  );
}

/** The Self-check tab: the four values the crew member enters by hand, with their status, age and a Record button. */
export function SelfCheckView({ frame, crewId }: { frame: TelemetryFrame | undefined; crewId: string }) {
  return <>{MANUAL_KEYS.map((m) => <Card key={m} metric={m} frame={frame} crewId={crewId} />)}</>;
}
