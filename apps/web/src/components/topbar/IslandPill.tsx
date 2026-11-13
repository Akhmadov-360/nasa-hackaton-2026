'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, CircleDot, Timer } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useCrewForecasts } from '@/hooks/useEta';
import { formatDuration } from '@/lib/duration';
import { crewName } from '@/lib/engineConfig';
import { dictionaries, useT, type DictKey } from '@/lib/i18n';
import { mmss } from '@/lib/norms';
import { STATUS_COLOR, STATUS_RANK, viewOfMetric } from '@/lib/metrics';
import { globalStatus, useMissionStore } from '@/lib/store/missionStore';

const ICON = { NOMINAL: CheckCircle2, CAUTION: CircleDot, WARNING: AlertTriangle, CRITICAL: AlertOctagon };

/** Short reading name for the island: the card title where there is one. */
function metricLabelKey(metric: string): DictKey | null {
  const key = (metric === 'bpSys' || metric === 'bpDia' ? 'metric.bp' : metric === 'doseRate' ? 'rad.rate' : metric === 'dose' ? 'rad.total' : `metric.${metric}`) as DictKey;
  return key in dictionaries.en ? key : null;
}

/**
 * The mission status "island". It shows the overall status; while nothing is in alarm yet it shows the nearest
 * forecast instead ("Pulse · 1:27", "+2" for the others). Hover or click it to open the full list; a row jumps to
 * that crew member and the tab with the reading. Details of an alert arrive as a Sileo toast that drops out of this
 * pill. On a new alert the pill swells.
 */
export function IslandPill() {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const island = useMissionStore((s) => s.island);
  const latest = useMissionStore((s) => s.latest);
  const tick = useMissionStore((s) => s.t);
  const jumpTo = useMissionStore((s) => s.jumpTo);
  const status = globalStatus(latest);
  const forecasts = useCrewForecasts(tick);
  const reduce = useReducedMotion();
  const [swell, setSwell] = useState(false);
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // the list closes itself when there is nothing left to list
  useEffect(() => { if (!showForecast) { pinned.current = false; setOpen(false); } }, [showForecast]);

  const hoverOpen = () => { clearTimeout(closeTimer.current); if (showForecast) setOpen(true); };
  const hoverClose = () => { if (pinned.current) return; clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 220); };
  const toggle = () => {
    if (!showForecast) return;
    pinned.current = !pinned.current;
    setOpen(pinned.current);
  };
  const go = (crewId: string, metric: string) => {
    jumpTo(crewId, metric);
    pinned.current = false;
    setOpen(false);
  };

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 18, mass: 0.9 };
  const warn = showForecast && next.level === 'critical' ? STATUS_COLOR.WARNING : STATUS_COLOR.CAUTION;
  const color = showForecast ? warn : STATUS_COLOR[status];
  const Icon = showForecast ? Timer : ICON[status];
  const withWord = showForecast && status !== 'NOMINAL';
  const base = withWord ? 380 : showForecast ? 310 : 220;

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
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold" aria-hidden>
          {withWord && <span style={{ color: STATUS_COLOR[status] }}>{t(`status.${status}` as const)} ·</span>}
          <span className="truncate">{nameOf(next.metric)}</span>
          <span className="num">{mmss(next.etaSec)}</span>
          {/* looks like what it is: a list you can open */}
          <span className="inline-flex cursor-pointer items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium transition-colors duration-200 hover:bg-white/10">
            {forecasts.length > 1 && <span>+{forecasts.length - 1}</span>}
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </span>
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
        <Popover open={open} onOpenChange={(o) => { if (!o) { pinned.current = false; setOpen(false); } }}>
          <PopoverAnchor asChild>
            <div
              className={`h-full ${showForecast ? 'cursor-pointer' : 'cursor-default'}`}
              role={showForecast ? 'button' : undefined}
              tabIndex={showForecast ? 0 : undefined}
              aria-expanded={showForecast ? open : undefined}
              aria-label={showForecast ? `${t(`status.${status}` as const)}. ${spoken}` : undefined}
              onPointerEnter={hoverOpen}
              onPointerLeave={hoverClose}
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
            >
              {body}
            </div>
          </PopoverAnchor>
          <PopoverContent
            side="bottom" align="center" sideOffset={10} className="w-80 space-y-0.5 p-1.5"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onPointerEnter={hoverOpen} onPointerLeave={hoverClose}
          >
            {forecasts.slice(0, 8).map((f) => (
              <button
                key={`${f.crewId}:${f.metric}`}
                type="button"
                onClick={() => go(f.crewId, f.metric)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-xs transition-colors duration-200 outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-ring"
                title={t(`view.${viewOfMetric(f.metric)}` as DictKey)}
              >
                <span className="min-w-0">
                  {t('island.forecast', { name: crewName(f.crewId), metric: nameOf(f.metric), time: formatDuration(f.etaSec, locale) })}
                </span>
                <span className="num shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium" style={{ color: f.level === 'critical' ? STATUS_COLOR.WARNING : STATUS_COLOR.CAUTION, background: 'rgba(255,255,255,0.06)' }}>
                  {mmss(f.etaSec)}
                </span>
              </button>
            ))}
            {forecasts.length > 8 && <p className="px-2.5 py-1 text-xs text-muted-foreground">+{forecasts.length - 8}</p>}
          </PopoverContent>
        </Popover>
      </motion.div>
    </div>
  );
}
