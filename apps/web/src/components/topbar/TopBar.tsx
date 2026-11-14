'use client';
import { useEffect, useState } from 'react';
import { FileText, Orbit, Radio, WifiOff } from 'lucide-react';
import BellToggle from '@/components/BellToggle';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tip } from '@/components/ui/tip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { isProvisional } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore, type Locale } from '@/lib/store/missionStore';
import { delayText, gravityText, missionLabel, missionOf, missionPlace, missions, roundTripText } from '@/lib/mission';
import { IslandPill } from './IslandPill';

function LinkReadout() {
  const t = useT();
  const mode = useMissionStore((s) => s.mode);
  const last = useMissionStore((s) => s.lastFrameAt);
  const locale = useMissionStore((s) => s.locale);
  const m = missionOf(useMissionStore((s) => s.missionId));
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
      <TooltipContent>{t('mission.delay')}: {delayText(m.delaySec, locale)}. {age === null ? '' : t('top.frame', { s: (Math.min(age, 99000) / 1000).toFixed(1) })}</TooltipContent>
    </Tooltip>
  );
}

/** Where the crew is. It changes the signal delay shown next to the link and the ground-contact advice, never the body readings. */
function MissionSelect() {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const id = useMissionStore((s) => s.missionId);
  const setMission = useMissionStore((s) => s.setMission);
  const m = missionOf(id);
  const tip = t('mission.tip', { place: missionPlace(m, locale), oneWay: delayText(m.delaySec, locale), round: roundTripText(m, locale), gravity: gravityText(m) });
  return (
    <Tip label={tip} side="bottom">
      <span className="hidden shrink-0 items-center gap-2 xl:inline-flex">
        <Select
          size="sm" ariaLabel={t('mission.label')} value={id} align="left" menuWidth={170}
          onChange={setMission}
          options={missions.map((x) => ({ value: x.id, label: missionLabel(x, locale) }))}
        />
        <span className="num hidden whitespace-nowrap text-xs text-muted-foreground 2xl:inline" aria-label={t('mission.delay')}>{delayText(m.delaySec, locale)}</span>
      </span>
    </Tip>
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
  const setReportOpen = useMissionStore((s) => s.setReportOpen);
  const hasImport = useMissionStore((s) => !!s.imported);

  return (
    <header className="hairline-b relative z-30 bg-bar">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <Orbit className="size-6 shrink-0 text-teal" aria-hidden />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold">{t('app.title')}</h1>
            <p className="num text-xs text-muted-foreground">
              {t('top.met')} <span className="text-bone">{formatMet(met)}</span>
              {isProvisional && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 cursor-help rounded-full bg-amber/15 px-2 py-0.5 font-sans text-xs text-amber">{t('badge.demo')}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t('badge.provisional')}</TooltipContent>
                </Tooltip>
              )}
            </p>
          </div>
          <MissionSelect />
        </div>
        <div className="hidden md:block"><IslandPill /></div>
        <div className="flex items-center justify-end gap-3">
          <Button size="sm" onClick={() => setReportOpen(true)} className="gap-2">
            <FileText /> {t('report.open')}{hasImport && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
          </Button>
          <LinkReadout />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <BellToggle
                  pressed={soundOn} onChange={setSound} size="sm" radius={12} label={t('top.sound')}
                  offLabel={t('top.soundOff')} onLabel={t('top.soundOn')} badge={false}
                  background="#1c2740" color="#9fb0c9" onBackground="#1f4a47" onColor="#8fe3d6"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{t('top.sound')} <Kbd>M</Kbd></TooltipContent>
          </Tooltip>
          <Select
            size="sm" ariaLabel={t('top.lang')} value={locale} align="right" menuWidth={150}
            onChange={(v) => setLocale(v as Locale)}
            options={(['en', 'ru', 'uz'] as Locale[]).map((l) => ({ value: l, label: t(`lang.${l}` as DictKey) }))}
          />
          <span className="rounded-full px-3 py-1 text-xs font-semibold md:hidden" style={{ color: STATUS_COLOR[status], background: `color-mix(in srgb, ${STATUS_COLOR[status]} 14%, transparent)` }}>
            {t(`status.${status}` as DictKey)}
          </span>
        </div>
      </div>
      {(mode === 'SIM' || mode === 'STALE') && (
        <p role="alert" className="hairline-t bg-amber/10 px-4 py-1 text-center text-xs font-medium text-amber">
          {mode === 'SIM' ? t('banner.sim') : t('banner.stale')}
        </p>
      )}
      <div className="px-4 pb-2 md:hidden"><IslandPill /></div>
    </header>
  );
}
