'use client';
import NumberFlow from '@number-flow/react';
import type { ReactNode } from 'react';
import type { Status, TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { Sparkline } from './Sparkline';

interface Props {
  crewId: string;
  label: string;
  icon: ReactNode;
  unit: string;
  value: number | undefined;
  decimals?: number;
  /** extra value shown after "/" (blood pressure) */
  value2?: number;
  status: Status;
  read: (f: TelemetryFrame) => number;
  tick: number;
  highlighted?: boolean;
  degraded?: boolean;
}

const finite = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export function VitalCard({ crewId, label, icon, unit, value, value2, decimals = 0, status, read, tick, highlighted, degraded }: Props) {
  const fmt = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const color = STATUS_COLOR[status];
  const alert = STATUS_RANK[status] >= STATUS_RANK.WARNING;
  return (
    <article
      aria-current={highlighted ? 'true' : undefined}
      className="glass relative flex flex-col gap-1 p-3 transition-[box-shadow,border-color] duration-500"
      style={{
        borderColor: alert ? `color-mix(in srgb, ${color} 55%, transparent)` : highlighted ? 'rgba(79,182,168,0.55)' : undefined,
        boxShadow: highlighted ? '0 0 0 1px rgba(79,182,168,0.35), 0 0 28px -8px rgba(79,182,168,0.5)' : undefined,
      }}
    >
      <header className="flex items-center justify-between gap-2 text-sm text-mist">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {status !== 'NOMINAL' ? <StatusBadge status={status} /> : degraded ? <span className="text-xs text-amber">est.</span> : null}
      </header>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[1.6rem] leading-[1.3] font-medium" aria-live="off">
          {finite(value) ? <NumberFlow value={value} format={fmt} locales="en-US" /> : '—'}
          {finite(value2) && (<>
            <span className="text-mist">/</span>
            <NumberFlow value={value2} format={fmt} locales="en-US" />
          </>)}
        </span>
        <span className="text-xs text-mist">{unit}</span>
      </div>
      <Sparkline crewId={crewId} read={read} color={color} tick={tick} />
    </article>
  );
}
