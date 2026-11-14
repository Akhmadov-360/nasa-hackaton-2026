'use client';
import NumberFlow from '@number-flow/react';
import { Radiation } from 'lucide-react';
import type { TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tip } from '@/components/ui/tip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { baseCfg } from '@/lib/engineConfig';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { useMissionStore } from '@/lib/store/missionStore';
import { Sparkline } from './Sparkline';

const ok = (v?: number): v is number => typeof v === 'number' && Number.isFinite(v);

/** Dose bar: where the crew's accumulated dose sits between zero and the 250 mSv solar-particle-event limit. */
function DoseBar({ total, color }: { total: number | undefined; color: string }) {
  const t = useT();
  const levels = baseCfg.thresholds.metrics.dose?.high;
  const max = levels?.critical ?? 250;
  const pct = ok(total) ? Math.min(100, (total / max) * 100) : 0;
  const marks = levels ? [levels.caution, levels.warning, levels.critical] : [];
  return (
    <div className="col-span-full">
      <div className="relative h-2 rounded-full bg-white/8" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={ok(total) ? total : 0} aria-label={t('rad.bar.label', { max })}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `max(${pct}%, 4px)`, background: color }} />
        {marks.map((m) => (
          <span key={m} className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-white/30" style={{ left: `${(m / max) * 100}%` }} aria-hidden />
        ))}
      </div>
      <div className="num relative mt-1 h-4 text-[10px] text-muted-foreground">
        {marks.map((m, i) => (
          <span key={m} className="absolute -translate-x-1/2" style={{ left: `${(m / max) * 100}%`, ...(i === marks.length - 1 ? { transform: 'translateX(-100%)' } : {}) }}>{m}</span>
        ))}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t('rad.bar.note', { max })}</p>
    </div>
  );
}

/** The crew's modelled dose: rate, accumulated dose and its distance from the NASA limit. */
export function RadiationCard({ frame, crewId, tick }: { frame: TelemetryFrame | undefined; crewId: string; tick: number }) {
  const t = useT();
  const openMetric = useMissionStore((s) => s.openMetric);
  const rate = frame?.radiation.doseRateUSvH;
  const total = frame?.radiation.cumulativeMSv;
  const sRate = frame?.status.byMetric.doseRate ?? 'NOMINAL';
  const sTotal = frame?.status.byMetric.dose ?? 'NOMINAL';
  const status = STATUS_RANK[sRate] >= STATUS_RANK[sTotal] ? sRate : sTotal;
  const color = STATUS_COLOR[status];
  return (
    <section
      className="grid h-full min-w-0 grid-cols-2 content-start gap-x-6 gap-y-3 bg-cell p-3.5 transition-[box-shadow,background-color] duration-500"
      style={
        STATUS_RANK[status] >= 2
          ? { background: `color-mix(in srgb, ${color} 9%, var(--color-cell))`, boxShadow: `inset 3px 0 0 ${color}` }
          : undefined
      }
      aria-label={t('rad.crewDose')}
    >
      <header className="col-span-full flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <Tip label={t('about.open', { name: t('rad.crewDose') })}>
          <button
            type="button"
            onClick={() => openMetric('dose')}
            aria-label={t('about.open', { name: t('rad.crewDose') })}
            className="-mx-1 flex cursor-pointer items-center gap-2 rounded-md px-1 transition-colors hover:text-bone focus-visible:text-bone"
          >
            <Radiation className="size-4" style={{ color }} aria-hidden /> {t('rad.crewDose')}
          </button>
          </Tip>
          <Tooltip>
            <TooltipTrigger asChild><Badge variant="modeled" tabIndex={0} className="cursor-help">{t('badge.modeled')}</Badge></TooltipTrigger>
            <TooltipContent>{t('src.modeled')}</TooltipContent>
          </Tooltip>
        </h3>
        <StatusBadge status={status} />
      </header>
      <div>
        <p className="text-xs text-muted-foreground">{t('rad.rate')}</p>
        {ok(rate) ? (
          <p className="num text-xl leading-[1.3] font-medium">
            <NumberFlow value={rate} format={{ maximumFractionDigits: 0 }} locales="en-US" />
            <span className="ml-1 text-xs text-muted-foreground">µSv/h</span>
          </p>
        ) : <Skeleton className="mt-1 h-6 w-20" />}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{t('rad.total')}</p>
        {ok(total) ? (
          <p className="num text-xl leading-[1.3] font-medium">
            <NumberFlow value={total} format={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }} locales="en-US" />
            <span className="ml-1 text-xs text-muted-foreground">mSv</span>
          </p>
        ) : <Skeleton className="mt-1 h-6 w-24" />}
      </div>
      <DoseBar total={total} color={color} />
      <div className="col-span-full">
        <Sparkline crewId={crewId} read={(f) => f.radiation.doseRateUSvH} color={color} tick={tick} points={120} className="h-16" />
      </div>
    </section>
  );
}
