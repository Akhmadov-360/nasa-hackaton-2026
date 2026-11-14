'use client';
import NumberFlow from '@number-flow/react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Status, TelemetryFrame } from '@astro/engine';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEta } from '@/hooks/useEta';
import { baseCfg } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { SOURCE_OF, STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { aboutKeyOf } from '@/lib/about';
import { useMissionStore } from '@/lib/store/missionStore';
import { ForecastPill, StatusForecastBadge } from './ForecastPill';
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
  /** normal range shown right of the number, see `normText` */
  norm?: string;
  className?: string;
  highlighted?: boolean;
  degraded?: boolean;
}

const finite = (v: number | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

/** Filled dot = recorded signal, ring = our model. The meaning is in the tooltip and the legend, not in colour alone. */
export function ProvenanceMark({ sourceKey, limitKey }: { sourceKey: string; limitKey?: string }) {
  const t = useT();
  const s = SOURCE_OF[sourceKey];
  if (!s) return null;
  const th = limitKey ? baseCfg.thresholds.metrics[limitKey] : undefined;
  const limit = th?.tier ? `${t(`limit.${th.tier}` as DictKey)}${th.source ? `. ${th.source}` : ''}` : '';
  const base = s.kind === 'real' ? t('src.real', { src: s.src }) : s.kind === 'manual' ? t('src.manual') : t('src.modeled');
  const text = limit ? `${base} ${limit}` : base;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-grid size-5 cursor-help place-items-center rounded-full" aria-label={text}>
          <span
            className={`size-2 ${s.kind === 'manual' ? 'rotate-45 rounded-[2px] bg-bone/70' : s.kind === 'real' ? 'rounded-full bg-teal' : 'rounded-full border border-amber bg-transparent'}`}
            aria-hidden
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

export function VitalCard({ crewId, sourceKey, metricKey, live, label, icon, unit, value, value2, decimals = 0, status, read, tick, norm, className, highlighted, degraded }: Props) {
  const t = useT();
  const openMetric = useMissionStore((s) => s.openMetric);
  const isOpen = useMissionStore((s) => s.metricDrawer !== null && aboutKeyOf(s.metricDrawer) === aboutKeyOf(metricKey));
  const eta = useEta(crewId, metricKey, tick, live);
  const fmt = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const color = STATUS_COLOR[status];
  const alert = STATUS_RANK[status] >= STATUS_RANK.WARNING;
  const waiting = value === undefined;
  return (
    <article
      aria-current={highlighted ? 'true' : undefined}
      onClick={() => openMetric(metricKey)}
      className={`group @container relative flex min-w-0 cursor-pointer flex-col gap-0.5 bg-cell p-3.5 transition-[box-shadow,background-color] duration-200 hover:bg-[color-mix(in_srgb,white_4%,var(--color-cell))] ${className ?? ''}`}
      style={{
        background: alert ? `color-mix(in srgb, ${color} 9%, var(--color-cell))` : highlighted || isOpen ? 'color-mix(in srgb, var(--color-teal) 9%, var(--color-cell))' : undefined,
        boxShadow: alert ? `inset 3px 0 0 ${color}` : highlighted || isOpen ? 'inset 3px 0 0 var(--color-teal)' : undefined,
      }}
    >
      <header className="flex items-center justify-between gap-1 text-[13px] text-muted-foreground">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openMetric(metricKey); }}
          title={t('about.open', { name: label })}
          aria-label={t('about.open', { name: label })}
          className="-mx-1 flex min-w-0 cursor-pointer items-center gap-1.5 truncate rounded-md px-1 text-left transition-colors group-hover:text-bone focus-visible:text-bone"
        >
          {icon}<span className="truncate">{label}</span>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-bone" aria-hidden />
        </button>
        <span className="flex shrink-0 items-center gap-1">
          {eta && status !== 'NOMINAL' ? (
            <StatusForecastBadge status={status} eta={eta} />
          ) : (
            <>
              {eta && <ForecastPill eta={eta} />}
              {status !== 'NOMINAL' ? <StatusBadge status={status} /> : degraded ? <span className="text-xs text-amber">{t('est')}</span> : null}
            </>
          )}
          <ProvenanceMark sourceKey={sourceKey} limitKey={metricKey} />
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
        {norm && (
          <span
            className={`num ml-auto hidden text-[11px] whitespace-nowrap text-muted-foreground/80 ${value2 !== undefined ? '@[13rem]:inline' : '@[8.5rem]:inline'}`}
            title={`${t('norm.label')}: ${norm}. ${t('norm.hint')}`}
            aria-label={`${t('norm.label')} ${norm}`}
          >
            {norm}
          </span>
        )}
      </div>
      <div className="mt-auto pt-2"><Sparkline crewId={crewId} read={read} color={color} tick={tick} /></div>
    </article>
  );
}
