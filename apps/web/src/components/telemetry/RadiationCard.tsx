'use client';
import NumberFlow from '@number-flow/react';
import { Radiation } from 'lucide-react';
import type { TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { Sparkline } from './Sparkline';
import { SpaceWeatherStrip } from './SpaceWeatherStrip';

export function RadiationCard({ frame, crewId, tick }: { frame: TelemetryFrame | undefined; crewId: string; tick: number }) {
  const t = useT();
  const rate = frame?.radiation.doseRateUSvH;
  const total = frame?.radiation.cumulativeMSv;
  const sRate = frame?.status.byMetric.doseRate ?? 'NOMINAL';
  const sTotal = frame?.status.byMetric.dose ?? 'NOMINAL';
  const status = STATUS_RANK[sRate] >= STATUS_RANK[sTotal] ? sRate : sTotal;
  const color = STATUS_COLOR[status];
  const ok = (v?: number): v is number => typeof v === 'number' && Number.isFinite(v);
  return (
    <section
      className="grid h-full min-w-0 grid-cols-[auto_auto_1fr] items-center gap-x-6 gap-y-1 bg-cell p-3.5 transition-[box-shadow,background-color] duration-500"
      style={
        STATUS_RANK[status] >= 2
          ? { background: `color-mix(in srgb, ${color} 9%, var(--color-cell))`, boxShadow: `inset 3px 0 0 ${color}` }
          : undefined
      }
      aria-label={t('rad.title')}
    >
      <header className="col-span-full flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <Radiation className="size-4" style={{ color }} aria-hidden /> {t('rad.title')}
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
      <div className="self-end [@media(max-height:820px)]:hidden">
        <Sparkline crewId={crewId} read={(f) => f.radiation.doseRateUSvH} color={color} tick={tick} points={120} />
      </div>
      <SpaceWeatherStrip />
    </section>
  );
}
