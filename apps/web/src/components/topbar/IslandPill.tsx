'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot, Timer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCrewForecasts } from '@/hooks/useEta';
import { formatDuration } from '@/lib/duration';
import { crewName } from '@/lib/engineConfig';
import { dictionaries, useT, type DictKey } from '@/lib/i18n';
import { mmss } from '@/lib/norms';
import { STATUS_COLOR, STATUS_RANK } from '@/lib/metrics';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

const ICON = { NOMINAL: CheckCircle2, CAUTION: CircleDot, WARNING: AlertTriangle, CRITICAL: AlertOctagon };

/** Short reading name for the island: the card title where there is one. */
function metricLabelKey(metric: string): DictKey | null {
  const key = (metric === 'bpSys' || metric === 'bpDia' ? 'metric.bp' : metric === 'doseRate' ? 'rad.rate' : metric === 'dose' ? 'rad.total' : `metric.${metric}`) as DictKey;
  return key in dictionaries.en ? key : null;
}

/**
 * The mission status "island". It shows the overall status; while nothing is in alarm yet it shows the nearest
 * forecast instead ("Pulse · 1:27", "+2" for the others), so the cards stay quiet. Details arrive as a Sileo toast
 * that drops out of this pill (same horizontal centre, directly below). On a new alert the pill swells and pushes
 * a droplet down, which is where the toast appears.
 */
export function IslandPill() {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const island = useMissionStore((s) => s.island);
  const latest = useMissionStore((s) => s.latest);
  const tick = useMissionStore((s) => s.t);
  const status = globalStatus(latest);
  const forecasts = useCrewForecasts(tick);
  const reduce = useReducedMotion();
  const [swell, setSwell] = useState(false);

  useEffect(() => {
    if (!island) return;
    setSwell(true);
    const id = setTimeout(() => setSwell(false), 1800);
    return () => clearTimeout(id);
  }, [island?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = forecasts[0];
  const showForecast = !!next && STATUS_RANK[status] < STATUS_RANK.WARNING;
  const nameOf = (m: string) => { const k = metricLabelKey(m); return k ? t(k) : m; };
  // read out by screen readers only when the leading reading changes, not every second
  const spoken = useMemo(
    () => (next ? t('island.forecastSr', { name: crewName(next.crewId), metric: nameOf(next.metric) }) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [next?.crewId, next?.metric, locale],
  );

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 18, mass: 0.9 };
  const warn = showForecast && next.level === 'critical' ? STATUS_COLOR.WARNING : STATUS_COLOR.CAUTION;
  const color = showForecast ? warn : STATUS_COLOR[status];
  const Icon = showForecast ? Timer : ICON[status];
  const withWord = showForecast && status !== 'NOMINAL';
  const base = withWord ? 360 : showForecast ? 280 : 220;

  const body = (
    <div className="relative flex h-full items-center justify-center gap-2.5 px-4" style={{ color }}>
      <motion.span
        animate={swell && !reduce ? { scale: [1, 1.3, 1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.9 }}
        className="grid shrink-0 place-items-center"
      >
        <Icon className="size-[18px]" aria-hidden />
      </motion.span>
      {showForecast ? (
        <span className="flex min-w-0 items-baseline gap-2 text-sm font-semibold" aria-hidden>
          {withWord && <span style={{ color: STATUS_COLOR[status] }}>{t(`status.${status}` as const)} ·</span>}
          <span className="truncate">{nameOf(next.metric)}</span>
          <span className="num">{mmss(next.etaSec)}</span>
          {forecasts.length > 1 && <span className="rounded-full bg-white/10 px-1.5 text-[11px] font-medium">+{forecasts.length - 1}</span>}
        </span>
      ) : (
        <span className="truncate text-sm font-semibold">{t(`status.${status}` as const)}</span>
      )}
    </div>
  );

  return (
    <div className="relative z-40 flex h-11 w-full justify-center" role="status" aria-live="polite">
      <motion.div className="absolute top-0" animate={{ width: swell ? base + 40 : base, height: 44 }} transition={spring}>
        {/* liquid body: the only element with the goo filter */}
        <div className="absolute inset-0" style={{ filter: 'url(#goo)' }} aria-hidden>
          <motion.div className="absolute inset-0 rounded-[22px] bg-panel-2" />
          <motion.div
            className="absolute left-1/2 size-5 -translate-x-1/2 rounded-full bg-panel-2"
            animate={{ y: swell ? 40 : 14, scale: swell ? 1 : 0 }}
            transition={spring}
          />
        </div>
        {showForecast ? (
          <Tooltip>
            <TooltipTrigger asChild><div className="h-full cursor-default" tabIndex={0}>{body}</div></TooltipTrigger>
            <TooltipContent side="bottom" className="space-y-1">
              {forecasts.slice(0, 6).map((f) => (
                <p key={`${f.crewId}:${f.metric}`}>
                  {t('island.forecast', { name: crewName(f.crewId), metric: nameOf(f.metric), time: formatDuration(f.etaSec, locale) })}
                </p>
              ))}
              {forecasts.length > 6 && <p className="text-muted-foreground">+{forecasts.length - 6}</p>}
            </TooltipContent>
          </Tooltip>
        ) : body}
        <span className="sr-only">{showForecast ? `${t(`status.${status}` as const)}. ${spoken}` : ''}</span>
      </motion.div>
    </div>
  );
}
