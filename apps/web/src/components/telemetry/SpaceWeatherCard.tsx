'use client';
import { useMemo } from 'react';
import { Satellite } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { STATUS_COLOR } from '@/lib/metrics';
import { useSpaceWeather } from '@/lib/spaceWeather';
import { ProvenanceMark } from './VitalCard';

const SCALE_COLOR = [STATUS_COLOR.NOMINAL, STATUS_COLOR.CAUTION, STATUS_COLOR.WARNING, STATUS_COLOR.WARNING, STATUS_COLOR.CRITICAL, STATUS_COLOR.CRITICAL];
const fmtFlux = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toPrecision(2));

const W = 420;
const H = 170;
const PAD = { l: 34, r: 8, t: 8, b: 20 };
const LO = -2; // 0.01 pfu
const HI = 3; // 1000 pfu
const TICKS = [-2, -1, 0, 1, 2, 3];

/** Real GOES proton flux: live value, NOAA storm scale and the last 24 hours on a log axis, across the whole card. */
export function SpaceWeatherCard() {
  const t = useT();
  const { weather, failed } = useSpaceWeather();

  const geometry = useMemo(() => {
    const pts = weather?.data.series10 ?? [];
    if (pts.length < 2) return null;
    const x0 = pts[0].t;
    const x1 = pts[pts.length - 1].t;
    const px = (ts: number) => PAD.l + ((ts - x0) / Math.max(1, x1 - x0)) * (W - PAD.l - PAD.r);
    const py = (f: number) => PAD.t + (1 - (Math.min(HI, Math.max(LO, Math.log10(Math.max(f, 1e-4)))) - LO) / (HI - LO)) * (H - PAD.t - PAD.b);
    return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.t).toFixed(1)} ${py(p.f).toFixed(1)}`).join(' '), py, x0, x1 };
  }, [weather]);

  const data = weather?.data;
  const color = data ? SCALE_COLOR[data.scale] : STATUS_COLOR.NOMINAL;
  const src = data
    ? t('sw.src', { sat: String(data.satellite ?? '?'), time: `${data.updatedAt.slice(11, 16)} UTC` }) + (weather?.stale ? ` ${t('sw.stale')}` : '')
    : '';

  return (
    <section className="flex h-full min-w-0 flex-col gap-3 bg-cell p-3.5" aria-label={t('sw.title')}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <Satellite className="size-4" style={{ color }} aria-hidden /> {t('sw.title')}
        </h3>
        <Tooltip>
          <TooltipTrigger asChild><span><ProvenanceMark sourceKey="goes" /></span></TooltipTrigger>
          <TooltipContent>{src || t('sw.unavailable')}</TooltipContent>
        </Tooltip>
      </header>

      {!data ? (
        failed ? <p className="text-sm text-muted-foreground" role="status">{t('sw.unavailable')}</p> : <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">{t('sw.flux')}</p>
              <p className="num text-xl leading-[1.3] font-medium">{fmtFlux(data.flux10)}<span className="ml-1 text-xs text-muted-foreground">pfu</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('sw.scale')}</p>
              <p className="text-xl leading-[1.3] font-medium" style={{ color }}>{data.scale === 0 ? t('sw.quiet') : `S${data.scale}`}</p>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('sw.chart')}>
            {TICKS.map((k) => {
              const y = geometry?.py(10 ** k) ?? 0;
              return (
                <g key={k}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="rgba(159,176,201,0.14)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="rgba(159,176,201,0.7)">{10 ** k}</text>
                </g>
              );
            })}
            {/* S1 starts at 10 pfu */}
            <line x1={PAD.l} x2={W - PAD.r} y1={geometry?.py(10) ?? 0} y2={geometry?.py(10) ?? 0} stroke={STATUS_COLOR.CAUTION} strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
            <text x={W - PAD.r} y={(geometry?.py(10) ?? 0) - 3} textAnchor="end" fontSize="9" fill={STATUS_COLOR.CAUTION}>S1</text>
            {geometry && <path d={geometry.d} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />}
            <text x={PAD.l} y={H - 5} fontSize="9" fill="rgba(159,176,201,0.7)">−24 h</text>
            <text x={W - PAD.r} y={H - 5} textAnchor="end" fontSize="9" fill="rgba(159,176,201,0.7)">{t('sw.now')}</text>
          </svg>
          <p className="text-[11px] leading-snug text-muted-foreground">{src}</p>
        </>
      )}
    </section>
  );
}
