'use client';
import NumberFlow from '@number-flow/react';
import { Radiation } from 'lucide-react';
import type { TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { Sparkline } from './Sparkline';

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
      className="glass grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 p-4 sm:grid-cols-[auto_auto_1fr]"
      style={STATUS_RANK[status] >= 2 ? { borderColor: `color-mix(in srgb, ${color} 55%, transparent)` } : undefined}
      aria-label={t('rad.title')}
    >
      <header className="col-span-full flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-mist">
          <Radiation className="size-4" style={{ color }} aria-hidden /> {t('rad.title')}
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-mist">{t('badge.modeled')}</span>
        </h3>
        <StatusBadge status={status} />
      </header>
      <div>
        <p className="text-xs text-mist">{t('rad.rate')}</p>
        <p className="num text-2xl leading-[1.3] font-medium">
          {ok(rate) ? <NumberFlow value={rate} format={{ maximumFractionDigits: 0 }} locales="en-US" /> : '—'}
          <span className="ml-1 text-xs text-mist">µSv/h</span>
        </p>
      </div>
      <div>
        <p className="text-xs text-mist">{t('rad.total')}</p>
        <p className="num text-2xl leading-[1.3] font-medium">
          {ok(total) ? <NumberFlow value={total} format={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }} locales="en-US" /> : '—'}
          <span className="ml-1 text-xs text-mist">mSv</span>
        </p>
      </div>
      <div className="col-span-full self-end sm:col-span-1">
        <Sparkline crewId={crewId} read={(f) => f.radiation.doseRateUSvH} color={color} tick={tick} points={120} />
      </div>
    </section>
  );
}
