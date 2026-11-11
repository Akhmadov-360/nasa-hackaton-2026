'use client';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';
import { useSpaceWeather } from '@/lib/spaceWeather';
import { ProvenanceMark } from './VitalCard';

const SCALE_COLOR = ['var(--color-teal)', 'var(--color-amber)', 'var(--color-coral)', 'var(--color-coral)', 'var(--color-crimson)', 'var(--color-crimson)'];

const fmtFlux = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toPrecision(2));

/** Real GOES proton flux for the last 24 h on a log scale. Separate from the crew's modelled dose. */
export function SpaceWeatherStrip({ large = false }: { large?: boolean }) {
  const t = useT();
  const { weather, failed } = useSpaceWeather();
  const d = useMemo(() => {
    const pts = weather?.data.series10 ?? [];
    if (pts.length < 2) return '';
    const logs = pts.map((p) => Math.log10(Math.max(p.f, 0.01)));
    const mn = Math.min(...logs, -1);
    const mx = Math.max(...logs, 1);
    return pts.map((_, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 100).toFixed(1)} ${(26 - ((logs[i] - mn) / (mx - mn)) * 22 - 2).toFixed(1)}`).join(' ');
  }, [weather]);

  if (!weather) {
    return (
      <p className="col-span-full border-t border-white/10 pt-2 text-xs text-muted-foreground" aria-live="polite">
        {t('sw.title')}: {failed ? t('sw.unavailable') : '…'}
      </p>
    );
  }
  const { data } = weather;
  const color = SCALE_COLOR[data.scale];
  const src = t('sw.src', { sat: String(data.satellite ?? '?'), time: data.updatedAt.slice(11, 16) + ' UTC' }) + (weather.stale ? ` ${t('sw.stale')}` : '');
  return (
    <div className="col-span-full flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/10 pt-2">
      <p className="flex items-center text-xs text-muted-foreground">
        {t('sw.title')}
        <Tooltip>
          <TooltipTrigger asChild><span><ProvenanceMark sourceKey="goes" /></span></TooltipTrigger>
          <TooltipContent>{src}</TooltipContent>
        </Tooltip>
      </p>
      <p className="text-xs text-muted-foreground">
        {t('sw.flux')} <span className="num ml-1 text-sm font-medium text-foreground">{fmtFlux(data.flux10)}</span> pfu
      </p>
      <p className="text-xs text-muted-foreground">
        {t('sw.scale')}{' '}
        <span className="ml-1 text-sm font-medium" style={{ color }}>{data.scale === 0 ? t('sw.quiet') : `S${data.scale}`}</span>
      </p>
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" className={`${large ? 'h-20' : 'h-6'} min-w-24 flex-1`} role="img" aria-label={t('sw.flux')}>
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      </svg>
    </div>
  );
}
