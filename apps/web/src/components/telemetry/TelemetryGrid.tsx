'use client';
import { Activity, Brain, ClipboardList, Cloud, Droplet, Droplets, Fan, Gauge, HeartPulse, Info, Radiation, Thermometer, Volume2, Waves, Wind, Zap } from 'lucide-react';
import { worstStatus } from '@astro/engine';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SelfCheckView } from '@/components/selfcheck/SelfCheckView';
import { HazardLegend } from '@/components/guidance/hazards';
import { WidgetBoundary } from '@/components/WidgetBoundary';
import { useCheckins } from '@/hooks/useCheckins';
import { useDisplayFrame } from '@/hooks/useDisplayFrame';
import { statusWord, useT, type DictKey } from '@/lib/i18n';
import { ORGANS, STATUS_COLOR, TELEMETRY_VIEWS, VIEW_METRICS, type TelemetryView } from '@/lib/metrics';
import { normText } from '@/lib/norms';
import { useMissionStore } from '@/lib/store/missionStore';
import { EcgChart } from './EcgChart';
import { RadiationCard } from './RadiationCard';
import { SpaceWeatherCard } from './SpaceWeatherCard';
import { VitalCard } from './VitalCard';

const ic = 'size-4 shrink-0';
const VIEW_ICON = { vitals: HeartPulse, cabin: Waves, radiation: Radiation, selfcheck: ClipboardList } as const;

export function TelemetryGrid({ crewId }: { crewId: string }) {
  const t = useT();
  const locale = useMissionStore((s) => s.locale);
  const view = useMissionStore((s) => s.telemetryView);
  const setView = useMissionStore((s) => s.setTelemetryView);
  const { frame, replay } = useDisplayFrame(crewId);
  const focused = useMissionStore((s) => s.focusedOrgan);
  const degraded = useMissionStore((s) => s.degraded[crewId]);
  const tick = useMissionStore((s) => s.t);
  const hl = (...keys: string[]) => {
    const organ = ORGANS.find((o) => o.id === focused);
    return !!organ && keys.some((k) => (organ.metrics as string[]).includes(k));
  };
  const s = (k: string) => frame?.status.byMetric[k] ?? 'NOMINAL';
  const v = frame?.vitals;

  const card = (
    key: string, label: string, icon: React.ReactNode, unit: string, value: number | undefined,
    read: (f: NonNullable<typeof frame>) => number, opts: { decimals?: number; className?: string } = {},
  ) => (
    <WidgetBoundary name={label} key={key}>
      <VitalCard
        crewId={crewId} sourceKey={key} metricKey={key} live={!replay} className={opts.className}
        label={label} icon={icon} unit={unit} value={value} decimals={opts.decimals} norm={normText(key, frame?.exercise)}
        status={s(key)} read={read} tick={tick} highlighted={hl(key)} degraded={degraded}
      />
    </WidgetBoundary>
  );

  /** one flat plateau: hairline dividers come from the 1px gap; every view has the same minimum height, so the tab bar never jumps */
  const plateau = (cols: string, children: React.ReactNode) => (
    <div className={`grid min-h-[17rem] grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-white/10 ${cols}`}>{children}</div>
  );

  const checkins = useCheckins();
  const items = TELEMETRY_VIEWS.map((k) => {
    const st = worstStatus(VIEW_METRICS[k].map(s));
    const Icon = VIEW_ICON[k];
    return {
      value: k,
      label: (
        <>
          <Icon className="size-4" aria-hidden />
          <span>{t(`view.${k}` as DictKey)}</span>
          {st !== 'NOMINAL' && <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[st] }} role="img" aria-label={statusWord(st, locale)} />}
          {k === 'selfcheck' && st === 'NOMINAL' && checkins.length > 0 && <span className="size-2 rounded-full border border-amber" role="img" aria-label={t('checkin.dot')} />}
        </>
      ),
    };
  });
  const info = t(`view.info.${view}` as DictKey);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <WidgetBoundary name="ECG"><EcgChart crewId={crewId} /></WidgetBoundary>

      <div className="flex items-center gap-1.5">
        <Segmented items={items} value={view} onChange={(x) => setView(x as TelemetryView)} size="md" label={t('view.label')} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label={t('view.info')}><Info className="size-4" /></Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-pretty">{info}</TooltipContent>
        </Tooltip>
        <HazardLegend />
      </div>

      {view === 'vitals' && plateau('md:grid-cols-4', <>
        {card('hr', t('metric.hr'), <HeartPulse className={ic} aria-hidden />, 'bpm', v?.hr, (f) => f.vitals.hr)}
        {card('spo2', t('metric.spo2'), <Droplets className={ic} aria-hidden />, '%', v?.spo2, (f) => f.vitals.spo2)}
        <WidgetBoundary name={t('metric.bp')} key="bp">
          <VitalCard
            crewId={crewId} sourceKey="bp" metricKey="bpSys" live={!replay} label={t('metric.bp')} icon={<Gauge className={ic} aria-hidden />} unit="mmHg"
            value={v?.bpSys} value2={v?.bpDia} status={worstStatus([s('bpSys'), s('bpDia')])} norm={normText('bpSys', frame?.exercise)}
            read={(f) => f.vitals.bpSys} tick={tick} highlighted={hl('bpSys', 'bpDia')} degraded={degraded}
          />
        </WidgetBoundary>
        {card('respRate', t('metric.respRate'), <Wind className={ic} aria-hidden />, '/min', v?.respRate, (f) => f.vitals.respRate)}
        {card('stress', t('metric.stress'), <Zap className={ic} aria-hidden />, 'idx', v?.stress, (f) => f.vitals.stress)}
        {card('eeg', t('metric.eeg'), <Brain className={ic} aria-hidden />, 'µV', v?.eeg, (f) => f.vitals.eeg, { decimals: 1 })}
        {card('hrv', t('metric.hrv'), <Activity className={ic} aria-hidden />, 'ms', v?.hrv, (f) => f.vitals.hrv)}
        {card('temp', t('metric.temp'), <Thermometer className={ic} aria-hidden />, '°C', v?.temp, (f) => f.vitals.temp, { decimals: 1 })}
      </>)}

      {/* three on the first row, two wider ones below: no empty cell */}
      {view === 'cabin' && plateau('md:grid-cols-6', <>
        {card('o2', t('metric.o2'), <Waves className={ic} aria-hidden />, '%', frame?.cabin.o2, (f) => f.cabin.o2, { decimals: 1, className: 'md:col-span-2' })}
        {card('co2', t('metric.co2'), <Cloud className={ic} aria-hidden />, 'mmHg', frame?.cabin.co2, (f) => f.cabin.co2, { decimals: 1, className: 'md:col-span-2' })}
        {card('humidity', t('metric.humidity'), <Droplet className={ic} aria-hidden />, '%', frame?.cabin.humidity, (f) => f.cabin.humidity, { className: 'md:col-span-2' })}
        {card('noise', t('metric.noise'), <Volume2 className={ic} aria-hidden />, 'NC', frame?.cabin.noise, (f) => f.cabin.noise, { className: 'md:col-span-3' })}
        {card('airflow', t('metric.airflow'), <Fan className={ic} aria-hidden />, 'm/s', frame?.cabin.airflow, (f) => f.cabin.airflow, { decimals: 2, className: 'md:col-span-3' })}
      </>)}

      {view === 'radiation' && plateau('md:grid-cols-2', <>
        <WidgetBoundary name={t('rad.crewDose')}><RadiationCard frame={frame} crewId={crewId} tick={tick} /></WidgetBoundary>
        <WidgetBoundary name={t('sw.title')}><SpaceWeatherCard /></WidgetBoundary>
      </>)}

      {view === 'selfcheck' && plateau('md:grid-cols-2', <SelfCheckView frame={frame} crewId={crewId} />)}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal" aria-hidden /> {t('badge.real')}</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-amber" aria-hidden /> {t('badge.modeled')}</span>
        {view === 'selfcheck' && <span className="flex items-center gap-1.5"><span className="size-2 rotate-45 rounded-[2px] bg-bone/70" aria-hidden /> {t('src.manualShort')}</span>}
      </p>
    </div>
  );
}
