'use client';
import { useEffect, useState } from 'react';
import { FileText, Orbit, Radio, WifiOff } from 'lucide-react';
import BellToggle from '@/components/BellToggle';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tip } from '@/components/ui/tip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isProvisional } from '@/lib/engineConfig';
import { useT, type DictKey } from '@/lib/i18n';
import { formatMet, STATUS_COLOR } from '@/lib/metrics';
import { globalStatus, useMissionStore, type Locale } from '@/lib/store/missionStore';
import { delayText, gravityText, missionLabel, missionOf, missionPlace, missions, roundTripText } from '@/lib/mission';
import { CheckinChip } from '@/components/selfcheck/CheckinChip';
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
          <span className="hidden text-muted-foreground sm:inline xl:hidden 2xl:inline">{t('top.link')}</span>
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
  // the explanation stays out of the way while the list is open (a click on the selector hides it until the pointer leaves)
  const [tipOpen, setTipOpen] = useState(false);
  const [hold, setHold] = useState(false);
  return (
    <Tooltip open={tipOpen && !hold} onOpenChange={setTipOpen}>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 items-center gap-2"
          onClickCapture={() => setHold(true)}
          onPointerLeave={() => setHold(false)}
        >
          <Select
            size="sm" ariaLabel={t('mission.label')} value={id} align="left" menuWidth={170}
            onChange={setMission}
            options={missions.map((x) => ({ value: x.id, label: missionLabel(x, locale) }))}
          />
          <span className="num hidden whitespace-nowrap text-xs text-muted-foreground 2xl:inline" aria-label={t('mission.delay')}>{delayText(m.delaySec, locale)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
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
  const setReportOpen = useMissionStore((s) => s.setReportOpen);
  const hasImport = useMissionStore((s) => !!s.imported);
  const narrow = useMediaQuery('(max-width: 639px)');
  /** the sound button shows only its bell on a phone and on a 1280 to 1535 px desktop, where the header columns are tight */
  const bellOnly = useMediaQuery('(max-width: 639px), (min-width: 1280px) and (max-width: 1535px)');

  return (
    <header className="hairline-b relative z-30 bg-bar">
      {/* phone: title and language, then the controls, then the status island; tablet: the island on its own row; wide desktop: three columns */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)_minmax(0,1fr)]">
        <div className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 max-w-full shrink-0 items-center gap-3">
          <Orbit className="size-6 shrink-0 text-teal" aria-hidden />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold">{t('app.title')}</h1>
            <p className="num flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">{t('top.met')} <span className="text-bone">{formatMet(met)}</span></span>
              {isProvisional && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help rounded-full bg-amber/15 px-2 py-0.5 font-sans text-xs whitespace-nowrap text-amber">{narrow ? t('badge.demoShort') : t('badge.demo')}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t('badge.provisional')}</TooltipContent>
                </Tooltip>
              )}
            </p>
          </div>
          </div>
          <MissionSelect />
        </div>
        <div className="hidden xl:block"><IslandPill /></div>
        <div className="contents sm:col-start-2 sm:row-start-1 sm:flex sm:items-center sm:justify-end sm:gap-3 xl:col-start-3">
          <div className="col-span-2 row-start-2 flex items-center justify-between gap-2 sm:contents">
            <CheckinChip />
            <Tip label={t('report.open')} side="bottom">
              <Button size="sm" onClick={() => setReportOpen(true)} className="gap-2" aria-label={t('report.open')}>
                <FileText /> <span className="hidden sm:inline">{t('report.open')}</span>{hasImport && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
              </Button>
            </Tip>
            <LinkReadout />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <BellToggle
                    pressed={soundOn} onChange={setSound} size="sm" radius={12} label={t('top.sound')}
                    offLabel={bellOnly ? '' : t('top.soundOff')} onLabel={bellOnly ? '' : t('top.soundOn')} badge={false}
                    background="#1c2740" color="#9fb0c9" onBackground="#1f4a47" onColor="#8fe3d6"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('top.sound')} <Kbd>M</Kbd>{locale === 'uz' && <span className="mt-1 block max-w-56 text-balance">{t('voice.note')}</span>}</TooltipContent>
            </Tooltip>
          </div>
          <div className="col-start-2 row-start-1">
            <Select
              size="sm" ariaLabel={t('top.lang')} value={locale} align="right" menuWidth={150}
              onChange={(v) => setLocale(v as Locale)}
              options={(['en', 'ru', 'uz'] as Locale[]).map((l) => ({ value: l, label: t(`lang.${l}` as DictKey) }))}
            />
          </div>
        </div>
        <div className="col-span-2 row-start-3 sm:row-start-2 xl:hidden"><IslandPill /></div>
      </div>
      {(mode === 'SIM' || mode === 'STALE') && (
        <p role="alert" className="hairline-t bg-amber/10 px-4 py-1 text-center text-xs font-medium text-amber">
          {mode === 'SIM' ? t('banner.sim') : t('banner.stale')}
        </p>
      )}
    </header>
  );
}
