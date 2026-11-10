'use client';
import NumberFlow from '@number-flow/react';
import type { ReactNode } from 'react';
import type { Status, TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEta } from '@/hooks/useEta';
import { formatDuration } from '@/lib/duration';
import { statusWord, useT } from '@/lib/i18n';
import { useMissionStore } from '@/lib/store/missionStore';
import { SOURCE_OF, STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { Timer } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface Props {
  crewId: string;
  /** key into SOURCE_OF for the provenance mark */
  sourceKey: string;
  /** metric whose trend is projected (thresholds key) */
  metricKey: string;
  /** false while replaying history: no live projection then */
  live: boolean;
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

/** Filled dot = recorded signal, ring = our model. The meaning is in the tooltip and the legend, not in colour alone. */
export function ProvenanceMark({ sourceKey }: { sourceKey: string }) {
  const t = useT();
  const s = SOURCE_OF[sourceKey];
  if (!s) return null;
  const text = s.kind === 'real' ? t('src.real', { src: s.src }) : t('src.modeled');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-grid size-5 cursor-help place-items-center rounded-full" aria-label={text}>
          <span
            className={`size-2 rounded-full ${s.kind === 'real' ? 'bg-teal' : 'border border-amber bg-transparent'}`}
            aria-hidden
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function VitalCard({ crewId, sourceKey, metricKey, live, label, icon, unit, value, value2, decimals = 0, status, read, tick, highlighted, degraded }: Props) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const eta = useEta(crewId, metricKey, read, status, tick, live);
  const fmt = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const color = STATUS_COLOR[status];
  const alert = STATUS_RANK[status] >= STATUS_RANK.WARNING;
  const waiting = value === undefined;
  return (
    <article
      aria-current={highlighted ? 'true' : undefined}
      className="relative flex min-w-0 flex-col gap-0.5 bg-cell p-3.5 transition-[box-shadow,background-color] duration-500"
      style={{
        background: alert ? `color-mix(in srgb, ${color} 9%, var(--color-cell))` : highlighted ? 'color-mix(in srgb, var(--color-teal) 9%, var(--color-cell))' : undefined,
        boxShadow: alert ? `inset 3px 0 0 ${color}` : highlighted ? 'inset 3px 0 0 var(--color-teal)' : undefined,
      }}
    >
      <header className="flex items-center justify-between gap-1 text-[13px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5 truncate">{icon}<span className="truncate">{label}</span></span>
        <span className="flex shrink-0 items-center">
          {status !== 'NOMINAL' ? <StatusBadge status={status} /> : degraded ? <span className="text-xs text-amber">{t('est')}</span> : null}
          <ProvenanceMark sourceKey={sourceKey} />
        </span>
      </header>
      <div className="flex items-baseline gap-1.5">
        {waiting ? (
          <Skeleton className="my-1 h-7 w-20" />
        ) : (
          <span className="num text-[1.55rem] leading-[1.3] font-medium">
            {finite(value) ? <NumberFlow value={value} format={fmt} locales="en-US" /> : '—'}
            {finite(value2) && (<>
              <span className="text-muted-foreground">/</span>
              <NumberFlow value={value2} format={fmt} locales="en-US" />
            </>)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {eta && (
        <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: eta.level === 'critical' ? STATUS_COLOR.CRITICAL : STATUS_COLOR.WARNING }}>
          <Timer className="size-3.5 shrink-0" aria-hidden />
          {t('trend.eta', { level: statusWord(eta.level === 'critical' ? 'CRITICAL' : 'WARNING', locale).toLowerCase(), time: formatDuration(eta.etaSec, locale) })}
        </p>
      )}
      <div className="mt-auto pt-2 [@media(max-height:820px)]:hidden"><Sparkline crewId={crewId} read={read} color={color} tick={tick} /></div>
    </article>
  );
}
