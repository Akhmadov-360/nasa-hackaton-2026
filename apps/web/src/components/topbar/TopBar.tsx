'use client';
import { useEffect, useState } from 'react';
import { Orbit, Radio, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { isProvisional } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore, type Locale } from '@/lib/store/missionStore';
import { IslandPill } from './IslandPill';

function LinkReadout() {
  const t = useT();
  const mode = useMissionStore((s) => s.mode);
  const last = useMissionStore((s) => s.lastFrameAt);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const age = last ? Math.max(0, Date.now() - last) : null;
  const good = mode === 'LIVE';
  const Icon = good ? Radio : WifiOff;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-sm" tabIndex={0}>
          <Icon className="size-4" style={{ color: good ? STATUS_COLOR.NOMINAL : STATUS_COLOR.CAUTION }} aria-hidden />
          <span className="text-muted-foreground">{t('top.link')}</span>
          <span className="font-medium">{t(`mode.${mode}` as DictKey)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{age === null ? '—' : t('top.frame', { s: (Math.min(age, 99000) / 1000).toFixed(1) })}</TooltipContent>
    </Tooltip>
  );
}

export function TopBar() {
  const t = useT();
  const met = useMissionStore((s) => s.t);
  const latest = useMissionStore((s) => s.latest);
  const mode = useMissionStore((s) => s.mode);
  const locale = useMissionStore((s) => s.locale);
  const setLocale = useMissionStore((s) => s.setLocale);
  const soundOn = useMissionStore((s) => s.soundOn);
  const setSound = useMissionStore((s) => s.setSound);
  const status = globalStatus(latest);

  return (
    <header className="relative">
      <div className="glass glass-blur grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 md:grid-cols-[1fr_minmax(0,460px)_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <Orbit className="size-6 shrink-0 text-teal" aria-hidden />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold">{t('app.title')}</h1>
            <p className="num text-xs text-muted-foreground">
              {t('top.met')} <span className="text-bone">{formatMet(met)}</span>
              {isProvisional && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 cursor-help rounded-full bg-amber/15 px-2 py-0.5 font-sans text-[11px] text-amber">{t('badge.modeled')}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t('badge.provisional')}</TooltipContent>
                </Tooltip>
              )}
            </p>
          </div>
        </div>
        <div className="hidden md:block"><IslandPill /></div>
        <div className="flex items-center justify-end gap-3">
          <LinkReadout />
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
                <Switch checked={soundOn} onCheckedChange={setSound} aria-label={t('top.sound')} />
              </label>
            </TooltipTrigger>
            <TooltipContent>{t('top.sound')} <Kbd>M</Kbd></TooltipContent>
          </Tooltip>
          <ToggleGroup
            type="single" value={locale} aria-label={t('top.lang')} className="hidden sm:inline-flex"
            onValueChange={(v) => v && setLocale(v as Locale)}
          >
            {(['en', 'ru', 'uz'] as Locale[]).map((l) => <ToggleGroupItem key={l} value={l} aria-label={l}>{l}</ToggleGroupItem>)}
          </ToggleGroup>
          <span className="rounded-full px-3 py-1 text-xs font-semibold md:hidden" style={{ color: STATUS_COLOR[status], background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)` }}>
            {t(`status.${status}` as DictKey)}
          </span>
        </div>
      </div>
      {(mode === 'SIM' || mode === 'STALE') && (
        <p role="alert" className="mx-auto mt-2 w-fit rounded-full bg-amber/15 px-4 py-1 text-xs font-medium text-amber">
          {mode === 'SIM' ? t('banner.sim') : t('banner.stale')}
        </p>
      )}
      <div className="mt-2 md:hidden"><IslandPill /></div>
    </header>
  );
}
